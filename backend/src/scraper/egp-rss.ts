import { XMLParser } from "fast-xml-parser"

import { env } from "@/config/env"

/**
 * Reads procurement announcements from the Comptroller General's Department
 * e-GP RSS feed.
 *
 * This is the channel the CGD publishes for exactly this purpose — government
 * agencies are told to consume it to mirror their own announcements — so
 * unlike scraping egp2.bangkok.go.th it needs no robots.txt exception, and the
 * feed hands over a direct PDF link instead of making us find one.
 *
 * Spec: "คู่มือการเชื่อมโยงประกาศจัดซื้อจัดจ้างจากระบบ e-GP ... ในรูปแบบ RSS",
 * กรมบัญชีกลาง, ธันวาคม 2567. Two limits from that document shape this module:
 *
 *  - §4.2 at most 20 items per announcement day (falling back over 7 days to
 *    reach 20). `countByDay` reports the real total, so a caller can tell when
 *    items were dropped and split the query to get the rest.
 *  - §4.8 the feed is only served between 17:01 and 08:29 ICT.
 */

/**
 * The window during which the feed answers (Asia/Bangkok), per the CGD manual
 * §4.8. It crosses midnight, so it reads as "from 17:01" or "until 08:29".
 */
const FEED_WINDOW = { fromMinute: 17 * 60 + 1, toMinute: 8 * 60 + 29 } as const

/** Announcement types (`anounceType`), table in §3.1.2. */
export const ANNOUNCE_TYPES = {
  /** แผนการจัดซื้อจัดจ้าง */
  plan: "P0",
  /** ประกาศราคากลาง */
  medianPrice: "15",
  /** ร่างเอกสารประกวดราคา (e-Bidding) และร่างเอกสารซื้อหรือจ้างด้วยวิธีสอบราคา */
  draft: "B0",
  /** ประกาศเชิญชวน — the feed's default when `anounceType` is omitted (§4.5) */
  invitation: "D0",
  /** ประกาศรายชื่อผู้ชนะ / ผู้ได้รับการคัดเลือก */
  winner: "W0",
  /** ยกเลิกประกาศเชิญชวน */
  invitationCancelled: "D1",
  /** เปลี่ยนแปลงประกาศเชิญชวน */
  invitationChanged: "D2",
} as const

export type AnnounceType = (typeof ANNOUNCE_TYPES)[keyof typeof ANNOUNCE_TYPES]

/** Procurement methods (`methodId`), table in §3.1.2. */
export const METHOD_IDS = {
  priceInquiry: "02",
  eMarket: "15",
  eBidding: "16",
  selective: "18",
  specific: "19",
  consultantOpen: "20",
  consultantSelective: "21",
  consultantSpecific: "22",
  designOpen: "23",
  designSelective: "24",
  designSpecific: "25",
  designContest: "26",
} as const

export type MethodId = (typeof METHOD_IDS)[keyof typeof METHOD_IDS]

export type EgpFeedQuery = {
  /** รหัสหน่วยงานภาครัฐ, 4 digits (e.g. "0304" = กรมบัญชีกลาง). */
  deptId?: string
  /** รหัสหน่วยจัดซื้อย่อย, 10 digits — narrower than deptId. */
  deptSubId?: string
  announceType?: AnnounceType
  methodId?: MethodId
  /** YYYYMMDD. Setting it disables the 7-day fallback (§4.6). */
  announceDate?: string
}

export type EgpAnnouncement = {
  /** Announcement title as published, Thai. */
  title: string
  /** Direct link to the announcement PDF. */
  pdfUrl: string
  /** เลขที่โครงการ, parsed out of <description> (§4.3). */
  projectNo: string
  /** วิธีการจัดหา as free text, e.g. "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)". */
  methodLabel: string
  /** ประเภทประกาศ as free text, e.g. "ประกาศเชิญชวน". */
  announceLabel: string
  /** YYYY-MM-DD as published. */
  publishedDate: string
}

/**
 * Whether a feed link points at the document itself rather than a web page.
 *
 * e-GP serves documents from two services, one per announcement type:
 *   - `egp-template-service/.../view-pdf-file` — the rendered announcement (D0)
 *   - `egp-upload-service/.../downloadFile…`   — the uploaded tender document (B0)
 *
 * Older items instead link to the e-GP search page, which carries no document;
 * extraction would receive an HTML page and bill a request to read it.
 */
const DOCUMENT_PATH_MARKERS = [
  "view-pdf-file",
  "downloadfile",
  "egp-upload-service",
]

function isDocumentLink(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    DOCUMENT_PATH_MARKERS.some((marker) => lower.includes(marker)) ||
    lower.endsWith(".pdf")
  )
}

export type EgpFeedResult = {
  items: EgpAnnouncement[]
  /**
   * How many announcements the feed says exist for that day (§4.7).
   * Greater than `items.length` means the 20-item cap dropped some.
   */
  countByDay: number
  /** True when the cap hid announcements — narrow the query and fetch again. */
  truncated: boolean
}

/** Whether the feed is currently inside one of its serving windows. */
export function isFeedOpen(now = new Date()): boolean {
  // Windows are stated in Thai local time; read the clock in that zone rather
  // than the host's, so a machine set to another timezone still decides right.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now)

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0)
  const nowMinute = hour * 60 + minute

  // Wraps past midnight, so either side of the boundary counts as open.
  return nowMinute >= FEED_WINDOW.fromMinute || nowMinute <= FEED_WINDOW.toMinute
}

/** Human-readable serving window, for log messages. */
export const FEED_WINDOW_LABEL = "17:01-08:29 ICT"

export function buildFeedUrl(query: EgpFeedQuery): string {
  const url = new URL(env.egpRssUrl)
  // Parameter names are the feed's own spelling — "anounceType" is missing an
  // "n" in the published API and must be sent exactly like that.
  if (query.deptId) url.searchParams.set("deptId", query.deptId)
  if (query.deptSubId) url.searchParams.set("deptsubId", query.deptSubId)
  if (query.announceType) url.searchParams.set("anounceType", query.announceType)
  if (query.methodId) url.searchParams.set("methodId", query.methodId)
  if (query.announceDate) url.searchParams.set("announceDate", query.announceDate)
  return url.toString()
}

/**
 * Splits "67119000332, ประกวดราคาอิเล็กทรอนิกส์ (e-bidding), ประกาศเชิญชวน"
 * into its three parts (§4.3). Missing parts come back as empty strings rather
 * than throwing: a malformed description should cost one field, not the item.
 */
function parseDescription(description: string): {
  projectNo: string
  methodLabel: string
  announceLabel: string
} {
  const [projectNo = "", methodLabel = "", announceLabel = ""] = description
    .split(",")
    .map((part) => part.trim())
  return { projectNo, methodLabel, announceLabel }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  // Titles are Thai text with entities; let the parser decode them.
  processEntities: true,
  trimValues: true,
})

/** A single <item>, as the parser hands it over before validation. */
type RawItem = {
  title?: unknown
  link?: unknown
  description?: unknown
  pubDate?: unknown
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function parseFeed(xml: string): EgpFeedResult {
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: RawItem | RawItem[]; countbyday?: unknown } }
  }
  const channel = parsed.rss?.channel
  if (!channel) {
    throw new Error("Feed response is not an RSS document")
  }

  // A single announcement parses to an object, several to an array.
  const rawItems = Array.isArray(channel.item)
    ? channel.item
    : channel.item
      ? [channel.item]
      : []

  const items = rawItems
    .map((raw): EgpAnnouncement => {
      const { projectNo, methodLabel, announceLabel } = parseDescription(
        asText(raw.description)
      )
      return {
        title: asText(raw.title),
        pdfUrl: asText(raw.link),
        projectNo,
        methodLabel,
        announceLabel,
        publishedDate: asText(raw.pubDate),
      }
    })
    // An item with no project number cannot be keyed against the database,
    // and one whose link is not the document itself cannot be extracted.
    .filter((item) => item.projectNo && isDocumentLink(item.pdfUrl))

  const countByDay = Number(channel.countbyday ?? 0) || 0

  return {
    items,
    countByDay,
    truncated: countByDay > items.length,
  }
}

/**
 * Decodes feed bytes, falling back to Windows-874 (Thai) rather than UTF-8.
 *
 * An unknown label would make TextDecoder throw, which must not cost the whole
 * fetch — Windows-874 is what this feed has always served.
 */
function decodeFeed(buffer: ArrayBuffer, declaredCharset?: string): string {
  for (const label of [declaredCharset, "windows-874"]) {
    if (!label) continue
    try {
      return new TextDecoder(label).decode(buffer)
    } catch {
      // Unknown label — try the next one.
    }
  }
  return new TextDecoder("windows-874").decode(buffer)
}

export async function fetchFeed(query: EgpFeedQuery): Promise<EgpFeedResult> {
  const url = buildFeedUrl(query)
  const response = await fetch(url, {
    headers: { "User-Agent": env.scraperUserAgent },
    signal: AbortSignal.timeout(60_000),
  })

  if (!response.ok) {
    throw new Error(`Feed returned HTTP ${response.status} for ${url}`)
  }

  // Thai text, and the feed declares its charset twice — inconsistently. The
  // HTTP header says ISO-8859-1 while the XML declaration says Windows-874,
  // and the bytes are Windows-874. Trusting the header yields mojibake, so
  // read the declaration out of the raw bytes (ASCII either way) and use that.
  const buffer = await response.arrayBuffer()
  const preamble = Buffer.from(buffer).subarray(0, 200).toString("latin1")
  const declared = preamble.match(/encoding=["']([\w-]+)["']/i)?.[1]
  const xml = decodeFeed(buffer, declared)

  return parseFeed(xml)
}

/**
 * Fetches one announcement type, working around the 20-item cap (§4.2).
 *
 * When the feed reports more announcements than it returned, the same query is
 * re-run per procurement method: each narrower query gets its own 20-item
 * allowance, so together they reach announcements the broad query hid.
 */
export async function fetchAnnouncements(
  query: EgpFeedQuery & { announceType: AnnounceType }
): Promise<EgpAnnouncement[]> {
  const broad = await fetchFeed(query)
  if (!broad.truncated) return broad.items

  const byProjectNo = new Map(broad.items.map((item) => [item.projectNo, item]))

  for (const methodId of Object.values(METHOD_IDS)) {
    const narrowed = await fetchFeed({ ...query, methodId })
    for (const item of narrowed.items) {
      byProjectNo.set(item.projectNo, item)
    }
  }

  return [...byProjectNo.values()]
}
