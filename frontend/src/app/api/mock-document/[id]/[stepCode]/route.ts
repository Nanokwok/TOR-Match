import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import { getMockTors } from "@/server/db/mock/tors"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; stepCode: string }> }
) {
  const { id, stepCode } = await context.params
  const tor = getMockTors().find((t) => t.id === id)

  const step = tor?.timeline?.steps.find((s) => s.code === stepCode)
  const safeNo = tor?.announcementNo ? tor.announcementNo.replace(/[^a-zA-Z0-9-_]/g, "_") : id
  const filename = step?.document?.fileName ?? `${stepCode}_${safeNo}_document.pdf`

  try {
    const pdfPath = path.join(
      process.cwd(),
      "src",
      "server",
      "db",
      "mock",
      "C_TOR_YYY_Digital_Multimedia_1.pdf"
    )
    const fileBuffer = await fs.readFile(pdfPath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    })
  } catch {
    // Fallback minimal valid PDF if file read fails
    const dummyPdf = `%PDF-1.4\n1 0 obj\n<< /Title (${filename}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`
    return new NextResponse(dummyPdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  }
}
