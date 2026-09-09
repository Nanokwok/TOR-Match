/**
 * A single announcement's trip through the ingestion pipeline, as shown in
 * /admin/scraper-ocr. Mirrors ScrapeJob in the backend.
 */

export type OcrJobStatus = "running" | "success" | "failure"

/**
 * "ocr" is currently never produced: Claude reads announcement PDFs directly,
 * so there is no separate OCR pass. The value is kept for the day a scanned
 * document needs one.
 */
export type OcrJobStage = "scrape" | "ocr" | "parse" | "index"

export type OcrJob = {
  id: string
  documentSource: string
  pages: number
  status: OcrJobStatus
  stage: OcrJobStage
  errorMessage: string
  sourceUrl: string
  createdAt: string
}
