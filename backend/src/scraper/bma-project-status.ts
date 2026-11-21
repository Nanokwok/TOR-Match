import { env } from "@/config/env"
import type { ProcurementStatus } from "@/scraper/announcement-plan"

/**
 * Asks the BMA site what became of a project.
 *
 * The RSS feed only serves seven days (§4.2 of the CGD manual), so a project
 * ingested before its cancellation was published can never learn of it from
 * the feed: the announcement is simply gone. Those TORs sit on /browse reading
 * "เปิดรับ" for ever.
 *
 * The publishing agency's own site still knows, and says so through the same
 * read-only JSON endpoint its project page calls — no scraping, no browser.
 * Verified against project 69099312015, which the feed cancelled on 2026-10-06
 * and which this endpoint independently reports as ยกเลิกโครงการ.
 *
 * Deliberately narrow: it is authoritative about cancellation and nothing
 * else. Project 69099310567 has a published winner and still reads
 * ระหว่างดำเนินการ here, because BMA tracks the contract rather than the award —
 * so a status learned from the feed is never downgraded by this.
 */

const DETAIL_PATH = "/appapi/api/Projects/GetProjectDetail"
const REQUEST_TIMEOUT_MS = 20_000

type ProjectDetail = {
  masterContractAvailableCode?: string
  masterContractAvailableName?: string
}

export type ProjectStatusReport = {
  code: string
  label: string
  /** What this means in our vocabulary, or null when it says nothing new. */
  status: ProcurementStatus | null
}

/**
 * The site's own status codes, as observed.
 *
 * Only cancellation is mapped. S1 (ระหว่างดำเนินการ) covers everything from a
 * draft tender to a signed contract, so reading our own status off it would
 * lose more than it gained.
 */
const STATUS_BY_CODE: Record<string, ProcurementStatus | null> = {
  S1: null,
  S5: "cancelled",
}

export function statusFromDetail(detail: ProjectDetail): ProjectStatusReport {
  const code = detail.masterContractAvailableCode?.trim() ?? ""
  return {
    code,
    label: detail.masterContractAvailableName?.trim() ?? "",
    status: STATUS_BY_CODE[code] ?? null,
  }
}

/**
 * Reads the status behind a project page URL.
 *
 * Takes the detail URL rather than a project number because callers already
 * store one — see resolveDetailUrls in bma-detail-link.ts for how it is found.
 * Returns null when the URL is not a BMA project page, or the site answers with
 * anything but a project.
 */
export async function fetchProjectStatus(detailUrl: string): Promise<ProjectStatusReport | null> {
  const projectId = detailUrl.split("/project-detail/")[1]?.split(/[/?#]/)[0]
  if (!projectId) return null

  const url = new URL(DETAIL_PATH, env.bmaBaseUrl)
  url.searchParams.set("projectId", projectId)

  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": env.scraperUserAgent },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) return null

  const detail = (await response.json()) as ProjectDetail
  return statusFromDetail(detail)
}
