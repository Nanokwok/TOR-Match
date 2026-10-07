import { localizedKey } from "@/models/localized.schema"
import { Tor, type TorDoc } from "@/models/Tor.model"
import type { TorDraftDoc } from "@/models/TorDraft.model"

/**
 * Copies a reviewed draft into the published `tors` collection.
 *
 * Shared by the admin review screen (a reviewer pressing publish) and by the
 * auto-publish hook on TorDraft (a draft that cleared the confidence
 * threshold), so the two paths cannot drift into publishing different subsets
 * of the fields or applying different rules about what is publishable.
 */

/** D0 ประกาศเชิญชวน, and D2 เปลี่ยนแปลงประกาศเชิญชวน, which supersedes it. */
const INVITATION_TYPES = new Set(["D0", "D2"])

/** Whether the invitation to bid has been published for this project. */
export function hasInvitation(draft: Pick<TorDraftDoc, "announcements">): boolean {
  return (draft.announcements ?? []).some((row) => INVITATION_TYPES.has(row.announceType))
}

/**
 * Why a draft cannot be published yet, or null when it can.
 *
 * Two bars, and the second is about timing rather than content:
 *
 * A title and a department, in either locale — Thai is the site's default and
 * announcements are published in Thai, so requiring English would leave every
 * ingested TOR unpublishable. Without those two a TOR is a blank card no
 * department filter can reach. Everything else may be empty and renders as
 * "not specified".
 *
 * And an invitation. A project is first published as B0 ร่างเอกสารประกวดราคา,
 * which states the qualifications but no closing date, because a draft tender
 * has none to state — bidding has not opened. Showing it on /browse offers a
 * bidder something they cannot act on and a deadline that reads "-". The
 * draft is kept and waits: D0 arrives a week or two later, the ingest reads it
 * for the deadline, and the TOR is published then.
 */
export function publishBlocker(draft: TorDraftDoc): string | null {
  for (const field of ["title", "department"] as const) {
    if (!localizedKey(draft[field])) return `${field} is empty`
  }
  if (!hasInvitation(draft)) return "no invitation announcement yet (D0)"
  return null
}

/**
 * Writes the draft's content to `tors` and records the publication on the
 * draft. Callers decide the review status that goes with it.
 */
export async function publishDraft(draft: TorDraftDoc): Promise<TorDoc> {
  // Copied field by field on purpose: the draft carries review bookkeeping
  // (aiConfidence, sourceJobId, ...) that must never reach the published
  // collection, and an allowlist keeps a future draft-only field from leaking
  // there by default.
  const content = {
    announcementNo: draft.announcementNo,
    // The documents themselves, so a bidder on /browse can read the tender,
    // the invitation and whatever came after it. Capped: a long-running
    // project collects amendments, and the published document should not grow
    // without bound for the sake of history nobody is reading.
    announcements: (draft.announcements ?? []).slice(-20),
    title: draft.title,
    department: draft.department,
    localOffice: draft.localOffice,
    budgetBaht: draft.budgetBaht,
    projectScale: draft.projectScale,
    durationDays: draft.durationDays,
    method: draft.method,
    status: draft.status,
    deadline: draft.deadline,
    announcementDate: draft.announcementDate,
    sourceUrl: draft.sourceUrl,
    summary: draft.summary,
    deliverables: draft.deliverables,
    techTags: draft.techTags,
    listTags: draft.listTags,
    financials: draft.financials,
    qualificationRequirements: draft.qualificationRequirements,
  }

  // Upsert by announcementNo — the natural key the seed and the ingestion
  // share — so re-publishing a corrected draft updates the live TOR instead of
  // duplicating it.
  const published = await Tor.findOneAndUpdate(
    { announcementNo: draft.announcementNo },
    { $set: content },
    { new: true, upsert: true, runValidators: true }
  )
  if (!published) {
    throw new Error(
      `Tor.findOneAndUpdate upsert unexpectedly returned null for ${draft.announcementNo}`
    )
  }
  return published
}
