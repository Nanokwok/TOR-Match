export type OcrJobStatus = "running" | "success" | "failure"

export type OcrJobStage = "scrape" | "ocr" | "parse" | "index"

export type OcrJob = {
  id: string
  documentSource: string
  pages: number
  status: OcrJobStatus
  stage: OcrJobStage
}

export const scraperOcrStats = {
  scraper: "Active",
  ocrQueue: "14 Pending",
  avgTime: "4.2s/PDF",
  ocrAccuracy: "98.2%",
  failedJobs: 2,
} as const

export const mockOcrJobs: OcrJob[] = [
  {
    id: "0343",
    documentSource: "BMA-SED-69-08-0142.pdf",
    pages: 24,
    status: "running",
    stage: "ocr",
  },
  {
    id: "0342",
    documentSource: "BMA-SED-69-08-0141.pdf",
    pages: 45,
    status: "success",
    stage: "index",
  },
  {
    id: "0341",
    documentSource: "BMA-PW-69-07-2210.pdf",
    pages: 18,
    status: "failure",
    stage: "ocr",
  },
  {
    id: "0340",
    documentSource: "BMA-IT-69-07-1188.pdf",
    pages: 32,
    status: "success",
    stage: "index",
  },
  {
    id: "0339",
    documentSource: "BMA-EDU-69-06-0901.pdf",
    pages: 12,
    status: "failure",
    stage: "parse",
  },
  {
    id: "0338",
    documentSource: "BMA-TRA-69-06-0554.pdf",
    pages: 28,
    status: "success",
    stage: "index",
  },
  {
    id: "0337",
    documentSource: "BMA-ENV-69-05-0412.pdf",
    pages: 21,
    status: "running",
    stage: "scrape",
  },
  {
    id: "0336",
    documentSource: "BMA-FIN-69-05-0330.pdf",
    pages: 40,
    status: "success",
    stage: "index",
  },
]
