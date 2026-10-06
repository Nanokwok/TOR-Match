import { env } from "@/config/env"

/**
 * Finds the web page an announcement lives on, so a bidder can go and read the
 * documents for themselves.
 *
 * Neither source we ingest from offers one. The CGD RSS feed's <link> is always
 * a file — a rendered PDF for D0, a ZIP archive for B0 — and e-GP reaches
 * individual announcements through a portal search rather than a URL anyone can
 * construct. The BMA's own procurement site does publish a page per project, at
 * /project-detail/<projectId>, but that id is internal and is not the project
 * number.
 *
 * This is the lookup that bridges the two. It is the same read-only endpoint the
 * site's own search page calls, needs no token, and is matched on the project
 * number rather than on search relevance — the search is full-text, so the first
 * row is not necessarily the right project.
 *
 * Covers BMA announcements only. Another agency's announcements resolve to
 * nothing, which callers must treat as "no page", never as a failure.
 */

const SEARCH_PATH = "/appapi/api/Projects/GetProjectFromFilter"
const REQUEST_TIMEOUT_MS = 20_000

export type SearchRow = {
  projectId?: string
  projectNumber?: string
}

/** The public page for a project, given the site's internal id. */
export function detailUrlFor(projectId: string): string {
  return new URL(`/project-detail/${projectId}`, env.bmaBaseUrl).toString()
}

async function search(projectNo: string): Promise<SearchRow[]> {
  const url = new URL(SEARCH_PATH, env.bmaBaseUrl)
  url.searchParams.set("projectSearchText", projectNo)
  url.searchParams.set("pageNo", "1")
  url.searchParams.set("pageSize", "10")
  url.searchParams.set("sortBy", "publishDateDesc")

  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": env.scraperUserAgent },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Project lookup returned HTTP ${response.status}`)

  const body = (await response.json()) as { data?: SearchRow[] }
  return Array.isArray(body.data) ? body.data : []
}

/**
 * Picks the row that is actually this project.
 *
 * Exact match on the project number, never "the first result": the endpoint is
 * a free-text search, so it can return a different project whose text happens
 * to contain the digits. Linking a TOR to the wrong announcement would be worse
 * than linking it to none — a bidder would read the wrong requirements.
 */
export function pickProject(rows: readonly SearchRow[], projectNo: string): string | null {
  const wanted = projectNo.trim()
  const match = rows.find((row) => row.projectNumber?.trim() === wanted)
  return match?.projectId?.trim() || null
}

/** The announcement's page, or null when this project is not on the BMA site. */
export async function resolveDetailUrl(projectNo: string): Promise<string | null> {
  const projectId = pickProject(await search(projectNo), projectNo)
  return projectId ? detailUrlFor(projectId) : null
}

/**
 * Resolves many projects, skipping the ones that cannot be found.
 *
 * Sequential on purpose: this runs against someone else's public service a
 * dozen times per ingest, and a burst of parallel requests would be rude for no
 * useful gain at that size.
 */
export async function resolveDetailUrls(
  projectNos: readonly string[]
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>()

  for (const projectNo of new Set(projectNos)) {
    try {
      const url = await resolveDetailUrl(projectNo)
      if (url) resolved.set(projectNo, url)
    } catch {
      // A lookup failure costs a convenience link, not the announcement — the
      // caller falls back to the document URL.
    }
  }

  return resolved
}
