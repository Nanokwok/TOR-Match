import { NextRequest, NextResponse } from "next/server"

import { requireAdminApiAccess } from "@/lib/admin-api"
import { required } from "@/lib/env"

const API_URL = required("NEXT_PUBLIC_API_URL")

const FRAME_HEADERS = {
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "default-src 'self'; frame-ancestors 'self'; object-src 'self' blob: data:",
}

function errorHtml(title: string, message: string) {
  const safeTitle = title.replace(/[<>&"]/g, "")
  const safeMessage = message.replace(/[<>&"]/g, "")
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f8fafc;
      color: #334155;
      padding: 16px;
      box-sizing: border-box;
    }
    .card {
      text-align: center;
      max-width: 420px;
      padding: 24px 20px;
      border-radius: 8px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    h3 { margin: 0 0 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; }
    p { margin: 0; font-size: 13px; line-height: 1.5; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <h3>${safeTitle}</h3>
    <p>${safeMessage}</p>
  </div>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const action = searchParams.get("action")
  const file = searchParams.get("file") ?? "0"

  if (!id) {
    if (action === "files") {
      return NextResponse.json({ error: "Draft ID is required" }, { status: 400 })
    }
    return new NextResponse(errorHtml("Draft ID Required", "Missing draft ID parameter."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8", ...FRAME_HEADERS },
    })
  }

  let token: string
  try {
    const auth = await requireAdminApiAccess()
    token = auth.token
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Unauthorized"
    if (action === "files") {
      return NextResponse.json({ error: errMessage }, { status: 401 })
    }
    return new NextResponse(errorHtml("Authentication Required", errMessage), {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8", ...FRAME_HEADERS },
    })
  }

  // Action: list all files inside the draft / ZIP
  if (action === "files") {
    try {
      const backendRes = await fetch(`${API_URL}/tor-drafts/${id}/files`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!backendRes.ok) {
        return NextResponse.json({ files: [] }, { status: backendRes.status })
      }

      const data = await backendRes.json()
      return NextResponse.json(data)
    } catch (err) {
      console.error("Admin PDF files proxy error:", err)
      return NextResponse.json({ files: [] }, { status: 502 })
    }
  }

  // Default: Stream the PDF for the requested file index
  try {
    const backendRes = await fetch(`${API_URL}/tor-drafts/${id}/pdf?file=${encodeURIComponent(file)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!backendRes.ok) {
      const errorText = await backendRes.text().catch(() => "Failed to fetch PDF")
      return new NextResponse(
        errorHtml("Document Preview Unavailable", errorText || "The document could not be retrieved from the server."),
        {
          status: backendRes.status,
          headers: { "Content-Type": "text/html; charset=utf-8", ...FRAME_HEADERS },
        }
      )
    }

    const contentType = backendRes.headers.get("content-type") || "application/pdf"
    const contentDisp = backendRes.headers.get("content-disposition") || `inline; filename="tor-${id}.pdf"`
    const buffer = await backendRes.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisp,
        "Cache-Control": "private, max-age=3600",
        ...FRAME_HEADERS,
      },
    })
  } catch (err) {
    console.error("Admin PDF proxy error:", err)
    return new NextResponse(
      errorHtml(
        "Connection Error",
        "Could not connect to the backend server. Please verify the backend service is running."
      ),
      {
        status: 502,
        headers: { "Content-Type": "text/html; charset=utf-8", ...FRAME_HEADERS },
      }
    )
  }
}
