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
  /** ยกเลิกประกาศรายชื่อผู้ชนะ / ผู้ได้รับการคัดเลือก */
  winnerCancelled: "W1",
  /** เปลี่ยนแปลงประกาศรายชื่อผู้ชนะ */
  winnerChanged: "W2",
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
  /**
   * Whether `pdfUrl` is the document itself rather than a portal page.
   *
   * Cancellations and award notices are published with a link to e-GP's own
   * search page, which carries no file. Those announcements still matter —
   * their *type* is the news — so they are kept, and only the types something
   * actually reads are required to carry a document.
   */
  isDocument: boolean
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
        isDocument: isDocumentLink(asText(raw.link)),
      }
    })
    // An item with no project number cannot be keyed against the database.
    // A portal link is kept: D1 ยกเลิกประกาศเชิญชวน and W1 are published that
    // way, and dropping them here meant a cancelled project stayed "open"
    // for ever — the status is in the announcement's type, not its file.
    .filter((item) => item.projectNo)

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

/** Spacing between feed requests, so a narrowing sweep is not a burst. */
const REQUEST_GAP_MS = 300

/**
 * Fetches one announcement type, optionally re-querying per procurement method
 * when the 20-item cap (§4.2) hid part of the day.
 *
 * **Measured on 2026-10-07: the method sweep does not work, and callers should
 * leave `narrowOnTruncation` off.** It was built on the assumption that each
 * narrower query gets its own 20-item allowance. Against the live feed:
 *
 *  - for `P0` the parameter is ignored outright — all twelve methods returned
 *    byte-identical responses (20 items, countbyday 84, same first items), and
 *    the twelve extra requests gained zero announcements;
 *  - for `D0` it *is* honoured (`02`/`18`/`19` returned nothing, `16` returned
 *    everything) but cannot split the day, because nearly every BMA
 *    announcement is e-bidding and therefore in the one bucket.
 *
 * {@link fetchAnnouncementsOverDays} is the axis that does work. This is kept
 * because `methodId` is honoured for some types and a future agency mix could
 * differ, and because `saturatedMethods` is what proves the ceiling is real.
 *
 * One method's request failing costs that method's share, not the type: the
 * broad result is still returned, and the failure is named so a short count has
 * a reason.
 */
export async function fetchAnnouncements(
  query: EgpFeedQuery & { announceType: AnnounceType },
  { narrowOnTruncation = true }: { narrowOnTruncation?: boolean } = {}
): Promise<FetchResult> {
  const broad = await fetchFeed(query)
  if (!broad.truncated || !narrowOnTruncation) {
    return { ...broad, requests: 1, saturatedMethods: [], failedMethods: [] }
  }

  const byProjectNo = new Map(broad.items.map((item) => [item.projectNo, item]))
  const saturatedMethods: MethodId[] = []
  const failedMethods: MethodId[] = []
  let requests = 1

  for (const methodId of Object.values(METHOD_IDS)) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_GAP_MS))
    requests += 1
    try {
      const narrowed = await fetchFeed({ ...query, methodId })
      for (const item of narrowed.items) {
        byProjectNo.set(item.projectNo, item)
      }
      if (narrowed.truncated) saturatedMethods.push(methodId)
    } catch {
      failedMethods.push(methodId)
    }
  }

  const items = [...byProjectNo.values()]
  // Still short of the day's total even after narrowing: the caller should say
  // so rather than report a number that silently omits announcements.
  return {
    items,
    countByDay: broad.countByDay,
    truncated: broad.countByDay > items.length,
    requests,
    saturatedMethods,
    failedMethods,
  }
}

/** What a fetch found, and whether the feed admitted to holding back more. */
export type FetchResult = {
  items: EgpAnnouncement[]
  /**
   * The day's real total as the feed reports it (§4.7), 0 when absent. Summed
   * across the days walked when the result came from
   * {@link fetchAnnouncementsOverDays}.
   */
  countByDay: number
  truncated: boolean
  /** Feed requests this cost, so the price of the sweep stays visible. */
  requests: number
  /** Methods whose own narrowed query hit the cap — unsplittable by method. */
  saturatedMethods: MethodId[]
  /** Methods whose narrowed request failed, so a short count has a reason. */
  failedMethods: MethodId[]
  /** Day-walk only: days the cap truncated, newest first. */
  cappedDays?: string[]
  /** Day-walk only: days whose request failed, newest first. */
  failedDays?: string[]
}

/**
 * The `announceDate` code (YYYYMMDD) for `back` days before `now`.
 *
 * Read in Asia/Bangkok, not the host's zone: the feed's day boundary is Thai
 * local, so a machine set to UTC would ask for the wrong day through most of
 * its evening — which is exactly when the feed is open (§4.8).
 */
export function announceDateCode(back: number, now = new Date()): string {
  const at = new Date(now.getTime() - back * 86_400_000)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(at)
    .replace(/-/g, "")
}

/**
 * Fetches one announcement type day by day, which is how the 20-item cap is
 * actually escaped.
 *
 * Setting `announceDate` disables the feed's own 7-day backfill (§4.6), and in
 * exchange each day queried gets its own 20-item allowance. The feed also
 * answers for days well outside those seven: walking back 45 days on
 * 2026-10-07 was still returning announcements at 2026-08-24, where the
 * undated query returned 20 items in total. Measured for B0+D0 over those 45
 * days: 405 projects, 72 of them software, against 20 from one undated query.
 *
 * A day over the cap is still capped — the axis multiplies allowances, it does
 * not lift the limit — so `cappedDays` names the days that lost announcements.
 * For B0/D0 that is rare (5-20 published a day); for P0 it is most days.
 *
 * Items are kept from every day and deduplicated by project *and url*, not by
 * project alone: a re-published tender is genuinely two documents, and
 * `mergeAnnouncementLinks` wants both.
 */
export async function fetchAnnouncementsOverDays(
  query: EgpFeedQuery & { announceType: AnnounceType },
  { days, onDay }: { days: number; onDay?: (date: string, result: EgpFeedResult) => void }
): Promise<FetchResult> {
  const byIdentity = new Map<string, EgpAnnouncement>()
  const cappedDays: string[] = []
  const failedDays: string[] = []
  let countByDay = 0
  let requests = 0

  for (let back = 0; back < days; back += 1) {
    const announceDate = announceDateCode(back)
    if (requests > 0) await new Promise((resolve) => setTimeout(resolve, REQUEST_GAP_MS))
    requests += 1
    try {
      const result = await fetchFeed({ ...query, announceDate })
      countByDay += result.countByDay
      if (result.truncated) cappedDays.push(announceDate)
      for (const item of result.items) {
        byIdentity.set(`${item.projectNo}\u0000${item.pdfUrl}`, item)
      }
      onDay?.(announceDate, result)
    } catch {
      // One day failing must not end a walk that may already have collected
      // weeks of announcements; the gap is named instead.
      failedDays.push(announceDate)
    }
  }

  return {
    items: [...byIdentity.values()],
    countByDay,
    truncated: cappedDays.length > 0,
    requests,
    saturatedMethods: [],
    failedMethods: [],
    cappedDays,
    failedDays,
  }
}
