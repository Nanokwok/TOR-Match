import type { Metadata } from "next"

import { listScrapeJobsAction } from "@/actions/admin-scraper"
import { ScraperOcrView } from "@/components/admin/scraper-ocr-view"

export const metadata: Metadata = {
  title: "Scraper & OCR | TOR Match Admin",
  robots: { index: false, follow: false },
}

export default async function AdminScraperOcrPage() {
  const { jobs, stats } = await listScrapeJobsAction()
  return <ScraperOcrView stats={stats} jobs={jobs} />
}
