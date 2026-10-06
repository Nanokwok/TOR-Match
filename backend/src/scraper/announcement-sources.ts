import { ANNOUNCE_TYPES, type AnnounceType, type EgpAnnouncement } from "@/scraper/egp-rss"

/**
 * Everything the feed published for one project, kept apart by type.
 *
 * A project number is the project's, not the announcement's, so the same number
 * reappears under a different type as it moves through its stages — verified
 * live: project 69079298848 was served as a B0 draft on 2026-09-25 and as a D0
 * invitation on 2026-10-01, same number, different documents.
 *
 * The types carry different things, and an earlier version of this module
 * collapsed them into two slots, which meant a W0 overwrote the D0 it was
 * grouped with:
 *
 *   B0 ร่างเอกสารประกวดราคา  the tender document — every bidder qualification,
 *                           but no closing date, because a draft has none
 *   D0 ประกาศเชิญชวน        the notice — defers the qualifications to that
 *                           document, but states the deadline
 *   D1/D2, W0/W1/W2         what became of the project: cancelled, amended,
 *                           awarded, award cancelled, award revised
 *   P0, 15                  the plan and the official median price
 *
 * Lives outside run-rss-ingest.ts because that module runs the ingest on
 * import; these decisions need to be testable without a database.
 */

/** A feed item that remembers which type's query returned it. */
export type StampedAnnouncement = EgpAnnouncement & { announceType: AnnounceType }

export type AnnouncementSources = {
  projectNo: string
  /** Every announcement seen this run for this project, in the order fetched. */
  all: StampedAnnouncement[]
}

/**
 * Which announcement speaks for the project's own metadata — its title, its
 * dates.
 *
 * An amendment supersedes the notice, which supersedes the tender draft. A
 * winner or cancellation notice never does: "ยกเลิกประกาศเชิญชวน..." is a fact
 * about the project, not its name.
 */
const METADATA_PRECEDENCE: AnnounceType[] = [
  ANNOUNCE_TYPES.invitationChanged,
  ANNOUNCE_TYPES.invitation,
  ANNOUNCE_TYPES.draft,
  ANNOUNCE_TYPES.medianPrice,
  ANNOUNCE_TYPES.plan,
]

/** Groups a per-type fetch into one entry per project, stamping each item. */
export function groupByProject(
  byType: ReadonlyMap<AnnounceType, readonly EgpAnnouncement[]>
): Map<string, AnnouncementSources> {
  const sources = new Map<string, AnnouncementSources>()
  for (const [announceType, items] of byType) {
    for (const item of items) {
      const entry = sources.get(item.projectNo) ?? { projectNo: item.projectNo, all: [] }
      entry.all.push({ ...item, announceType })
      sources.set(item.projectNo, entry)
    }
  }
  return sources
}

/** The newest announcement of one type, or undefined when the run saw none. */
export function latestOf(
  entry: AnnouncementSources,
  announceType: AnnounceType
): StampedAnnouncement | undefined {
  return entry.all
    .filter((item) => item.announceType === announceType)
    .sort((a, b) => a.publishedDate.localeCompare(b.publishedDate))
    .at(-1)
}

/** Which types this run saw for the project. */
export function typesIn(entry: AnnouncementSources): Set<AnnounceType> {
  return new Set(entry.all.map((item) => item.announceType))
}

/**
 * The announcement whose metadata describes the project best.
 *
 * Falls back to whatever exists when none of the metadata-bearing types are
 * present — a run that saw only a W0 still has to name the project somehow.
 */
export function primary(entry: AnnouncementSources): StampedAnnouncement {
  for (const announceType of METADATA_PRECEDENCE) {
    const found = latestOf(entry, announceType)
    if (found) return found
  }
  const [fallback] = entry.all
  if (!fallback) throw new Error(`No announcement for project ${entry.projectNo}`)
  return fallback
}

/**
 * The documents one extraction should read, best first.
 *
 * The tender document leads because it holds the qualifications, which are the
 * expensive thing to get right; the notice and any amendment follow for the
 * deadline. `stored.pdfUrl` stands in for a tender that has aged out of the
 * feed's seven-day window — by the time the D0 appears, the B0 usually has.
 */
export function documentsToRead(
  entry: AnnouncementSources,
  stored?: { pdfUrl?: string }
): string[] {
  const urls = [
    latestOf(entry, ANNOUNCE_TYPES.draft)?.pdfUrl ?? stored?.pdfUrl,
    latestOf(entry, ANNOUNCE_TYPES.invitation)?.pdfUrl,
    latestOf(entry, ANNOUNCE_TYPES.invitationChanged)?.pdfUrl,
  ].filter((url): url is string => Boolean(url))

  return [...new Set(urls)]
}

/**
 * The two link mirrors the rest of the codebase reads.
 *
 * `pdfUrl` is only ever a tender document and `invitationUrl` only ever a
 * notice or its amendment. run-prune-invitation-only.ts tells the two apart by
 * the shape of `pdfUrl`, so letting a D0 land there would make it delete real
 * tenders. Existing values are kept when this run saw nothing better.
 */
export function linksFor(
  entry: AnnouncementSources,
  stored?: { pdfUrl?: string; invitationUrl?: string }
): { pdfUrl: string; invitationUrl: string } {
  const tender = latestOf(entry, ANNOUNCE_TYPES.draft)
  const notice =
    latestOf(entry, ANNOUNCE_TYPES.invitationChanged) ?? latestOf(entry, ANNOUNCE_TYPES.invitation)

  return {
    pdfUrl: tender?.pdfUrl ?? stored?.pdfUrl ?? "",
    invitationUrl: notice?.pdfUrl ?? stored?.invitationUrl ?? "",
  }
}

/** One stored row of {@link AnnouncementSources}, as the schema holds it. */
export type AnnouncementLink = {
  announceType: string
  announceLabel: string
  url: string
  publishedDate: string
  title: string
  seenAt?: Date
}

/**
 * Folds this run's announcements into what is already stored.
 *
 * Identity is (announceType, url): a re-published amendment carries a new url
 * and is kept as its own row, while the same announcement seen on five
 * consecutive nights stays one row with its original `seenAt`.
 */
export function mergeAnnouncementLinks(
  stored: readonly AnnouncementLink[] | undefined,
  entry: AnnouncementSources,
  now = new Date()
): { rows: AnnouncementLink[]; added: AnnouncementLink[] } {
  const rows = [...(stored ?? [])]
  const seen = new Set(rows.map((row) => `${row.announceType}\u0000${row.url}`))
  const added: AnnouncementLink[] = []

  for (const item of entry.all) {
    const key = `${item.announceType}\u0000${item.pdfUrl}`
    if (seen.has(key)) continue
    seen.add(key)

    const row: AnnouncementLink = {
      announceType: item.announceType,
      announceLabel: item.announceLabel,
      url: item.pdfUrl,
      publishedDate: item.publishedDate,
      title: item.title,
      seenAt: now,
    }
    rows.push(row)
    added.push(row)
  }

  return { rows, added }
}

/**
 * Where the TOR page's "view original" button sends a person.
 *
 * The announcement's page on the publishing agency's site, so they can read the
 * documents there themselves. The document link is only a fallback: it is a
 * file — a rendered PDF at best, a ZIP that downloads at worst — but a button
 * that goes somewhere beats one that goes nowhere.
 *
 * Shared by the ingest and the backfill so the two cannot disagree about it.
 */
export function sourceUrlFor(links: { detailUrl?: string; pdfUrl?: string }): string {
  return links.detailUrl || links.pdfUrl || ""
}
