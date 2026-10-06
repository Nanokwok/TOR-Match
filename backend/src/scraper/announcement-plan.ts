import { PROCUREMENT_STATUSES } from "@/models/tor-fields.schema"
import {
  documentsToRead,
  latestOf,
  typesIn,
  type AnnouncementLink,
  type AnnouncementSources,
} from "@/scraper/announcement-sources"
import { ANNOUNCE_TYPES, type AnnounceType } from "@/scraper/egp-rss"

/**
 * Decides what a project's new announcements are worth paying for.
 *
 * Reading a tender document costs a model call; recording that a project was
 * cancelled costs a database write. Keeping that judgement in one pure
 * function means the ingest cannot quietly start paying for the cheap cases,
 * and every rule is testable without a feed or a database.
 */

export type ProcurementStatus = (typeof PROCUREMENT_STATUSES)[number]

export type IngestAction =
  | { kind: "none"; reason: string }
  | { kind: "links" }
  | { kind: "status"; status: ProcurementStatus; from: AnnounceType }
  | { kind: "median-price"; url: string }
  | { kind: "extract"; urls: string[]; from: AnnounceType }

export type StoredProject = {
  announcements?: AnnouncementLink[]
  pdfUrl?: string
  deadline?: string
  status?: string
}

/**
 * What each announcement type says became of the project.
 *
 * D0 reopens nothing: it is the invitation that starts the bidding, so it only
 * ever means "open". The four below it are terminal in the sense that they
 * describe an outcome, not a stage.
 */
const STATUS_BY_TYPE: Partial<Record<AnnounceType, ProcurementStatus>> = {
  [ANNOUNCE_TYPES.invitation]: "open",
  [ANNOUNCE_TYPES.invitationChanged]: "changed",
  [ANNOUNCE_TYPES.invitationCancelled]: "cancelled",
  [ANNOUNCE_TYPES.winner]: "awarded",
  [ANNOUNCE_TYPES.winnerCancelled]: "winner-cancelled",
  [ANNOUNCE_TYPES.winnerChanged]: "winner-revised",
}

/**
 * Announcements that settle the project's outcome, oldest decision first.
 *
 * A project can be awarded and then have that award cancelled and then
 * revised, so the later announcement in this list wins when a single run sees
 * several of them.
 */
const TERMINAL_ORDER: AnnounceType[] = [
  ANNOUNCE_TYPES.invitationCancelled,
  ANNOUNCE_TYPES.winner,
  ANNOUNCE_TYPES.winnerCancelled,
  ANNOUNCE_TYPES.winnerChanged,
]

const TERMINAL_STATUSES = new Set<string>([
  "cancelled",
  "awarded",
  "winner-cancelled",
  "winner-revised",
])

/**
 * The status these announcement types imply, or null when they imply nothing.
 *
 * An outcome is sticky: once a project is cancelled or awarded, a D0 still
 * sitting in the feed's seven-day window must not reopen it.
 */
export function statusForTypes(
  types: readonly AnnounceType[],
  current?: string
): ProcurementStatus | null {
  const present = new Set(types)

  for (const announceType of [...TERMINAL_ORDER].reverse()) {
    if (present.has(announceType)) return STATUS_BY_TYPE[announceType] ?? null
  }

  if (current && TERMINAL_STATUSES.has(current)) return null

  if (present.has(ANNOUNCE_TYPES.invitationChanged)) return "changed"
  if (present.has(ANNOUNCE_TYPES.invitation)) return "open"
  return null
}

/** Announcements this run saw that are not already stored. */
function newTypes(entry: AnnouncementSources, stored?: StoredProject): Set<AnnounceType> {
  const known = new Set((stored?.announcements ?? []).map((row) => `${row.announceType}\u0000${row.url}`))
  const fresh = new Set<AnnounceType>()
  for (const item of entry.all) {
    if (!known.has(`${item.announceType}\u0000${item.pdfUrl}`)) fresh.add(item.announceType)
  }
  return fresh
}

/**
 * The single action to take for one project this run. First match wins.
 */
export function planForProject(input: {
  entry: AnnouncementSources
  stored?: StoredProject
  force?: boolean
}): IngestAction {
  const { entry, stored, force } = input
  const seen = typesIn(entry)
  const fresh = newTypes(entry, stored)

  if (force && stored) {
    return { kind: "extract", urls: documentsToRead(entry, stored), from: ANNOUNCE_TYPES.draft }
  }

  // A project enters only through its tender document. An invitation alone
  // defers every qualification to a document we would not have, which
  // publishes a TOR nothing can be matched against; a winner notice alone
  // would mint a TOR for a project nobody can bid on any more.
  if (!stored && !seen.has(ANNOUNCE_TYPES.draft)) {
    return { kind: "none", reason: "no tender document" }
  }

  if (fresh.size === 0) return { kind: "none", reason: "nothing new" }

  // Outcomes are recorded from the announcement type itself — no download, no
  // model call. What a cancellation notice says is already in its type.
  const terminal = [...TERMINAL_ORDER].reverse().find((announceType) => fresh.has(announceType))
  if (terminal) {
    // An outcome belongs to a project we hold. Reaching a project for the
    // first time already cancelled or awarded, the tender is worth nothing —
    // nobody can bid on it — and a status write would have no draft to land
    // on, so the announcement would be recorded as handled while nothing
    // happened at all.
    if (!stored) {
      return { kind: "none", reason: `already ${STATUS_BY_TYPE[terminal] ?? "concluded"}` }
    }

    const status = STATUS_BY_TYPE[terminal]
    if (status) return { kind: "status", status, from: terminal }
  }

  if (fresh.has(ANNOUNCE_TYPES.draft) && !stored) {
    return { kind: "extract", urls: documentsToRead(entry, stored), from: ANNOUNCE_TYPES.draft }
  }

  // A notice is read even when it is only two pages: the deadline exists
  // nowhere else. Which of its fields may overwrite the tender's is the
  // merge's decision, not this one.
  for (const announceType of [ANNOUNCE_TYPES.invitationChanged, ANNOUNCE_TYPES.invitation]) {
    if (fresh.has(announceType)) {
      return { kind: "extract", urls: documentsToRead(entry, stored), from: announceType }
    }
  }

  if (fresh.has(ANNOUNCE_TYPES.draft)) {
    return { kind: "extract", urls: documentsToRead(entry, stored), from: ANNOUNCE_TYPES.draft }
  }

  // The official median price is worth a small model call, but only for a
  // project we already hold: ราคากลาง announcements are among the feed's most
  // numerous, and one for an unknown project buys nothing.
  const medianPrice = latestOf(entry, ANNOUNCE_TYPES.medianPrice)
  if (fresh.has(ANNOUNCE_TYPES.medianPrice) && stored && medianPrice) {
    return { kind: "median-price", url: medianPrice.pdfUrl }
  }

  return { kind: "links" }
}
