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

/**
 * Why a draft cannot be published yet, or null when it can.
 *
 * TORs publish with whatever the source stated: summary, deadline and the rest
 * may be empty and render as "not specified". Only a title and a department are
 * required, and in either locale — Thai is the site's default language and an
 * announcement is published in Thai, so requiring English would leave every
 * ingested TOR unpublishable. Without those two a TOR is a blank card that no
 * department filter can reach, which is why they are the line.
 */
export function publishBlocker(draft: TorDraftDoc): string | null {
  for (const field of ["title", "department"] as const) {
    if (!localizedKey(draft[field])) return `${field} is empty`
  }
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
