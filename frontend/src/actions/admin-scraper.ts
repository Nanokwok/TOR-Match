"use server"

import { getAdminToken } from "@/lib/admin-session"
import { ApiRequestError, apiFetch } from "@/lib/api-client"
import type { OcrJob } from "@/types/scraper"

/** Reads the ingestion pipeline's job history for /admin/scraper-ocr. */

type BackendScrapeJob = {
  _id: string
  documentSource: string
  sourceUrl: string
  stage: OcrJob["stage"]
  status: OcrJob["status"]
  pages: number
  attempts: number
  errorMessage: string
  createdAt: string
  finishedAt: string | null
}

type JobsResponse = {
  items: BackendScrapeJob[]
  stats: { pending: number; failed: number }
}

export type ScraperOcrStats = {
  scraper: string
  ocrQueue: string
  avgTime: string
  ocrAccuracy: string
  failedJobs: number
}

function toOcrJob(job: BackendScrapeJob): OcrJob {
  return {
    // Short, readable handle for the table; the full id stays out of the UI.
    id: job._id.slice(-6),
    documentSource: job.documentSource,
    pages: job.pages,
    status: job.status,
    stage: job.stage,
    errorMessage: job.errorMessage,
    sourceUrl: job.sourceUrl,
    createdAt: job.createdAt,
  }
}

function toStats(response: JobsResponse): ScraperOcrStats {
  const finished = response.items.filter((job) => job.finishedAt)
  const averageMs =
    finished.length > 0
      ? finished.reduce(
          (total, job) =>
            total + (new Date(job.finishedAt!).getTime() - new Date(job.createdAt).getTime()),
          0
        ) / finished.length
      : 0

  const succeeded = response.items.filter((job) => job.status === "success").length
  const completed = succeeded + response.stats.failed

  return {
    scraper: response.stats.pending > 0 ? "Running" : "Idle",
    ocrQueue: `${response.stats.pending} Pending`,
    avgTime: averageMs > 0 ? `${(averageMs / 1000).toFixed(1)}s/doc` : "—",
    // Share of jobs that produced a draft — not an OCR character-accuracy
    // figure, which nothing measures. Extraction quality is reported per
    // draft as aiConfidence instead.
    ocrAccuracy: completed > 0 ? `${Math.round((succeeded / completed) * 100)}%` : "—",
    failedJobs: response.stats.failed,
  }
}

export async function listScrapeJobsAction(): Promise<{
  jobs: OcrJob[]
  stats: ScraperOcrStats
}> {
  try {
    const token = await getAdminToken()
    if (!token) throw new ApiRequestError(401, "Admin session expired")

    const response = await apiFetch<JobsResponse>("/tor-drafts/jobs", {
      headers: { Authorization: `Bearer ${token}` },
    })

    return { jobs: response.items.map(toOcrJob), stats: toStats(response) }
  } catch (error) {
    console.error("listScrapeJobsAction failed", error)
    return {
      jobs: [],
      stats: {
        scraper: "Unavailable",
        ocrQueue: "—",
        avgTime: "—",
        ocrAccuracy: "—",
        failedJobs: 0,
      },
    }
  }
}
