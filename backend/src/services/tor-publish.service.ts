import { localizedKey } from "@/models/localized.schema"
import { Tor } from "@/models/Tor.model"
import type { TorDraftDoc } from "@/models/TorDraft.model"

/**
 * Copies a reviewed draft into the published `tors` collection.
 *
 * Shared by the admin review screen (a reviewer pressing publish) and by the
 * RSS ingest (a draft that cleared the auto-approve threshold), so the two
 * paths cannot drift into publishing different subsets of the fields.
 */

/**
 * Why a draft cannot be published yet, or null when it can.
 *
 * TORs publish with whatever the scraper found — summary, deadline and the rest
 * may be empty and render as "not specified". Only a title and a department are
 * required: without them a TOR is a blank card that no department filter can
 * reach.
 */
export function publishBlocker(draft: TorDraftDoc): string | null {
  for (const field of ["title", "department"] as const) {
    if (!localizedKey(draft[field])) return `${field} is empty`
  }
  return null
}

export async function publishDraft(draft: TorDraftDoc) {
  // Copied field by field on purpose: the draft carries review bookkeeping
  // (aiConfidence, sourceJobId, ...) that must never reach the published
  // collection, and an allowlist keeps a future draft-only field from leaking
  // there by default.
  const content = {
    announcementNo: draft.announcementNo,
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

  // Upsert by announcementNo — the natural key the seed and the scraper share —
  // so re-publishing a corrected draft updates the live TOR instead of
  // duplicating it.
  const published = await Tor.findOneAndUpdate(
    { announcementNo: draft.announcementNo },
    { $set: content },
    { new: true, upsert: true, runValidators: true }
  )

  draft.set({
    reviewStatus: "approved",
    publishedTorId: published?._id ?? null,
    publishedAt: new Date(),
  })
  await draft.save()

  return published
}
