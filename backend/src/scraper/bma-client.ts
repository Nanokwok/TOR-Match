/// <reference lib="dom" />
// The page.evaluate callbacks below are serialized and run inside the browser,
// so this file needs DOM types even though nothing here executes in Node.

import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { env } from "@/config/env"

/**
 * Reads BMA's public procurement site (egp2.bangkok.go.th).
 *
 * Politeness is not optional here and lives in this module so there is exactly
 * one place to get it right:
 *
 *  - robots.txt allows crawling the public pages and asks for `Crawl-delay: 1`.
 *    Every navigation and every file fetch goes through `polite()`, so the
 *    whole scraper cannot exceed one request per second no matter how it is
 *    called.
 *  - The User-Agent identifies the project and a reachable contact
 *    (env.scraperUserAgent).
 *
 * On the PDF: the TOR document is served from /api/file/..., which robots.txt
 * disallows, and is linked from the allowed detail page as the public
 * "ดูประกาศ" download. Fetching it is a deliberate, user-approved exception
 * (see the plan file) limited to one document per announcement that already
 * passed our filters — never bulk enumeration of /api/. Keep it that way.
 */

const MIN_REQUEST_INTERVAL_MS = 1000
const NAV_TIMEOUT_MS = 60_000

let lastRequestAt = 0

/** Blocks until at least MIN_REQUEST_INTERVAL_MS has passed since the previous request. */
async function polite(): Promise<void> {
  const waitMs = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now()
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }
  lastRequestAt = Date.now()
}

export type BmaDocument = {
  label: string
  url: string
  postedDate: string
}

export type BmaListing = {
  detailUrl: string
  projectNo: string
  title: string
  department: string
  budgetBaht: number | null
}

export type BmaProjectDetail = BmaListing & {
  government: string
  subGovernment: string
  procurementType: string
  procurementCategory: string
  workType: string
  medianPriceBaht: number | null
  projectStatus: string
  documents: BmaDocument[]
}

/** "2,200,000.00 บาท" -> 2200000; "-" and blanks -> null. */
export function parseThaiNumber(raw: string | undefined): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^\d.]/g, "")
  if (!cleaned) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/**
 * Buddhist-era date to ISO with Thailand's offset: "09/09/2569" -> "2026-09-09T00:00:00+07:00".
 * Years below 2200 are assumed to already be CE and pass through.
 */
export function parseThaiDate(raw: string | undefined): string | null {
  if (!raw) return null
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  const ce = Number(year) >= 2200 ? Number(year) - 543 : Number(year)
  return `${ce}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00+07:00`
}

/**
 * Turns "label :\nvalue" runs of a page's innerText into a lookup.
 *
 * The site is a Tailwind div soup with no stable class names or ids, so the
 * rendered label/value text is a more durable contract than any selector.
 */
function parseLabeledFields(text: string): Record<string, string> {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const fields: Record<string, string> = {}
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.endsWith(":")) continue
    const label = line.slice(0, -1).trim()
    const value = lines[i + 1]
    // A value that is itself a label means this field was rendered empty.
    if (label && value && !value.endsWith(":")) {
      fields[label] = value === "-" ? "" : value
    }
  }
  return fields
}

export async function launchBrowser(): Promise<{ browser: Browser; context: BrowserContext }> {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    userAgent: env.scraperUserAgent,
    locale: "th-TH",
  })
  return { browser, context }
}

/**
 * Walks the search results newest-first and returns one entry per row.
 *
 * Only the listing is read here — cheap, one request per 10 announcements — so
 * callers can filter before paying for detail pages and PDFs.
 */
export async function discoverListings(
  page: Page,
  { pages: pageCount }: { pages: number }
): Promise<BmaListing[]> {
  const listings: BmaListing[] = []

  await polite()
  await page.goto(`${env.bmaBaseUrl}/project-search`, {
    waitUntil: "networkidle",
    timeout: NAV_TIMEOUT_MS,
  })

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    await page.waitForSelector('a[href^="/project-detail/"]', { timeout: NAV_TIMEOUT_MS })

    const rows = await page.evaluate(() => {
      const anchors = Array.from(
        document.querySelectorAll('a[href^="/project-detail/"]')
      ) as HTMLAnchorElement[]

      return anchors.map((anchor) => {
        // Climb to the ancestor holding the whole row. The details block and
        // the row above it both contain "เลขที่โครงการ", and only the row
        // carries the project title — which renders as its first line. So the
        // stop condition is "has the fields AND leads with something that is
        // not a label", i.e. the title.
        let node: HTMLElement | null = anchor
        for (let depth = 0; depth < 10 && node; depth += 1) {
          const text = node.innerText ?? ""
          const firstLine = text.split("\n").map((l) => l.trim()).filter(Boolean)[0] ?? ""
          if (text.includes("เลขที่โครงการ") && firstLine && !firstLine.endsWith(":")) break
          node = node.parentElement
        }
        return {
          href: anchor.getAttribute("href") ?? "",
          text: node?.innerText ?? "",
        }
      })
    })

    for (const row of rows) {
      if (!row.href || !row.text) continue
      const fields = parseLabeledFields(row.text)
      const projectNo = fields["เลขที่โครงการ"]
      if (!projectNo) continue

      // The title is the row's first line; the budget follows a bare
      // "งบประมาณ (บาท)" header rather than a "label :" pair.
      const lines = row.text.split("\n").map((line) => line.trim()).filter(Boolean)
      const budgetIndex = lines.findIndex((line) => line.startsWith("งบประมาณ"))

      listings.push({
        detailUrl: new URL(row.href, env.bmaBaseUrl).toString(),
        projectNo,
        title: lines[0] ?? "",
        department: fields["หน่วยงาน/หน่วยงานพาณิชย์"] ?? "",
        budgetBaht: budgetIndex >= 0 ? parseThaiNumber(lines[budgetIndex + 1]) : null,
      })
    }

    if (pageIndex === pageCount - 1) break

    const nextButton = page.getByText("หน้าต่อไป", { exact: false }).first()
    if ((await nextButton.count()) === 0) break

    await polite()
    await nextButton.click()
    await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT_MS })
  }

  return listings
}

export async function fetchProjectDetail(
  page: Page,
  listing: BmaListing
): Promise<BmaProjectDetail> {
  await polite()
  await page.goto(listing.detailUrl, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS })
  await page.waitForSelector("text=รายละเอียดโครงการ", { timeout: NAV_TIMEOUT_MS })

  const text = await page.evaluate(() => document.body.innerText)
  const fields = parseLabeledFields(text)

  const documents = await page.evaluate(() => {
    const anchors = Array.from(
      document.querySelectorAll('a[href*="/api/file/"]')
    ) as HTMLAnchorElement[]

    return anchors.map((anchor) => {
      // The document's kind ("ร่างขอบเขตของงาน (TOR)") and its posted date sit
      // beside the link in the announcements list, not inside it.
      let node: HTMLElement | null = anchor
      for (let depth = 0; depth < 5 && node; depth += 1) {
        if ((node.innerText?.length ?? 0) > (anchor.innerText?.length ?? 0) + 5) break
        node = node.parentElement
      }
      const surrounding = node?.innerText ?? ""
      const dateMatch = surrounding.match(/\d{2}\/\d{2}\/\d{4}/)
      return {
        url: anchor.getAttribute("href") ?? "",
        label: surrounding.split("\n").map((l) => l.trim()).filter(Boolean)[0] ?? "",
        postedDate: dateMatch?.[0] ?? "",
      }
    })
  })

  return {
    ...listing,
    title: fields["ชื่อโครงการ"] || listing.title,
    projectNo: fields["เลขที่โครงการ"] || listing.projectNo,
    department: fields["หน่วยงาน/หน่วยงานพาณิชย์"] || listing.department,
    government: fields["ส่วนราชการ"] ?? "",
    subGovernment: fields["ส่วนราชการย่อย"] ?? "",
    procurementType: fields["ประเภทการจัดซื้อจัดจ้าง"] ?? "",
    procurementCategory: fields["ประเภทการจัดหา"] ?? "",
    workType: fields["ด้านตามลักษณะงาน"] ?? "",
    budgetBaht: parseThaiNumber(fields["งบประมาณ"]) ?? listing.budgetBaht,
    medianPriceBaht: parseThaiNumber(fields["ราคากลาง"]),
    projectStatus: fields["สถานะโครงการ"] ?? "",
    documents: documents
      .filter((doc) => doc.url)
      .map((doc) => ({ ...doc, url: new URL(doc.url, env.bmaBaseUrl).toString() })),
  }
}

/** The TOR itself, preferred over any other attached announcement. */
export function pickTorDocument(documents: BmaDocument[]): BmaDocument | null {
  return (
    documents.find((doc) => /TOR|ขอบเขตของงาน/i.test(`${doc.label} ${doc.url}`)) ??
    documents[0] ??
    null
  )
}

export async function downloadDocument(
  context: BrowserContext,
  url: string
): Promise<Buffer | null> {
  await polite()
  const response = await context.request.get(url, { timeout: NAV_TIMEOUT_MS })
  if (!response.ok()) {
    console.warn(`[scrape] document fetch failed (${response.status()}): ${url}`)
    return null
  }
  return Buffer.from(await response.body())
}
