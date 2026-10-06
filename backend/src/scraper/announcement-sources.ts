import { ANNOUNCE_TYPES, type AnnounceType, type EgpAnnouncement } from "@/scraper/egp-rss"

/**
 * Pairing up the two ways the feed publishes the same project.
 *
 * A project number is the project's, not the announcement's, so the same number
 * appears under both types as it moves through its stages — verified live:
 * project 69079298848 was served as a B0 draft on 2026-09-25 and as a D0
 * invitation on 2026-10-01, same number, different documents.
 *
 * The two carry different things, and the ingest used to collapse them into one
 * entry, discarding whichever lost:
 *
 *   B0 ร่างเอกสารประกวดราคา  the tender document — every bidder qualification,
 *                           but no closing date, because a draft has none, and
 *                           served as a ZIP that downloads rather than opens
 *   D0 ประกาศเชิญชวน        the two-page notice — defers the qualifications to
 *                           that document, but states the deadline, and renders
 *                           as a PDF a person can actually open
 *
 * Kept apart here so one extraction can read both.
 *
 * Lives outside run-rss-ingest.ts because that module runs the ingest on
 * import; these decisions need to be testable without a database.
 */

export type AnnouncementSources = {
  projectNo: string
  /** B0 — the tender document, where the qualifications are. */
  draft?: EgpAnnouncement
  /** D0 — the notice, where the deadline is. */
  invitation?: EgpAnnouncement
}

/** Groups a per-type fetch into one entry per project. */
export function groupByProject(
  byType: ReadonlyMap<AnnounceType, readonly EgpAnnouncement[]>
): Map<string, AnnouncementSources> {
  const sources = new Map<string, AnnouncementSources>()
  for (const [announceType, items] of byType) {
    for (const item of items) {
      const entry = sources.get(item.projectNo) ?? { projectNo: item.projectNo }
      if (announceType === ANNOUNCE_TYPES.draft) entry.draft = item
      else entry.invitation = item
      sources.set(item.projectNo, entry)
    }
  }
  return sources
}

/**
 * The announcement whose metadata describes the project best.
 *
 * The invitation is the real announcement, so its title and date are the
 * published ones; the draft only stands in where no invitation exists yet.
 */
export function primary(entry: AnnouncementSources): EgpAnnouncement {
  const lead = entry.invitation ?? entry.draft
  if (!lead) throw new Error(`No announcement for project ${entry.projectNo}`)
  return lead
}

/**
 * The document the extraction should read first.
 *
 * The tender document, wherever there is one: it holds the qualifications,
 * which is the expensive thing to get right. The invitation is read alongside
 * it for the deadline.
 */
export function primaryDocument(entry: AnnouncementSources): EgpAnnouncement {
  const document = entry.draft ?? entry.invitation
  if (!document) throw new Error(`No document for project ${entry.projectNo}`)
  return document
}

/**
 * Whether a stored draft is worth re-reading because its invitation has since
 * been published.
 *
 * B0 arrives one to two weeks before D0, so a project first seen as a draft is
 * stored with no closing date. Without this the ingest would mark it "known"
 * for ever and that TOR would never get a deadline — which is exactly what had
 * happened to every B0-sourced TOR in the database.
 */
export function needsInvitation(
  draft: { invitationUrl?: string; deadline?: string },
  entry: AnnouncementSources
): boolean {
  return Boolean(entry.invitation) && !draft.invitationUrl && !draft.deadline
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

/** What the feed can refresh without paying for another extraction. */
export function changedFields(
  draft: { pdfUrl?: string; invitationUrl?: string },
  entry: AnnouncementSources
): Record<string, string> {
  const changes: Record<string, string> = {}

  const document = entry.draft ?? entry.invitation
  if (document?.pdfUrl && draft.pdfUrl !== document.pdfUrl) {
    changes.pdfUrl = document.pdfUrl
  }

  // The invitation is recorded for its deadline, and so a later run knows it
  // has already been read. It is deliberately NOT where the TOR page sends a
  // person: that button should open the website carrying the announcement, and
  // a rendered PDF is a file, not somewhere to go and read the documents.
  if (entry.invitation && draft.invitationUrl !== entry.invitation.pdfUrl) {
    changes.invitationUrl = entry.invitation.pdfUrl
  }

  return changes
}
