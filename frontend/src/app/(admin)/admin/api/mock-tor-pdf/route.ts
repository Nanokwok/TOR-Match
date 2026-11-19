import { readFile } from "node:fs/promises"
import path from "node:path"

import { NextResponse } from "next/server"

const MOCK_TOR_PDF_PATH = "C_TOR_YYY_Digital_Multimedia_1.pdf"

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    "src/server/db/mock",
    MOCK_TOR_PDF_PATH
  )

  try {
    const file = await readFile(filePath)
    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${MOCK_TOR_PDF_PATH}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 })
  }
}
