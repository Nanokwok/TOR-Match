import type { Metadata } from "next"

import { ScraperOcrView } from "@/components/admin/scraper-ocr-view"
import {
  mockOcrJobs,
  scraperOcrStats,
} from "@/server/db/mock/admin-scraper"

export const metadata: Metadata = {
  title: "Scraper & OCR | TOR Match Admin",
  robots: { index: false, follow: false },
}

export default function AdminScraperOcrPage() {
  return <ScraperOcrView stats={scraperOcrStats} jobs={mockOcrJobs} />
}
