import { localizedKey } from "@/models/localized.schema"
import { Tor } from "@/models/Tor.model"
import type { TorDraftDoc } from "@/models/TorDraft.model"
import { notifyCompaniesForTor } from "@/services/match-notification.service"

/**
 * Copies a reviewed draft into the published `tors` collection.
 *
 * Shared by the admin review screen (a reviewer pressing publish) and by
 * TorDraft's auto-publish hook (a draft that cleared the confidence
 * threshold), so the two paths cannot drift into publishing different
 * subsets of the fields, or one of them forgetting to notify companies.
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

export async function publishDraft(
  draft: TorDraftDoc,
  reviewStatus: "approved" | "auto-approved" = "approved"
) {
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
  if (!published) {
    throw new Error(`Tor.findOneAndUpdate upsert unexpectedly returned null for ${draft.announcementNo}`)
  }

  draft.set({
    reviewStatus,
    publishedTorId: published._id,
    publishedAt: new Date(),
  })
  await draft.save()

  // Awaited (not fire-and-forget) so a client refetching notifications right
  // after this response can't race ahead of the write — same reasoning as
  // the company-save trigger in company.controller.ts. A notification bug
  // must still never fail the publish itself, hence the catch.
  await notifyCompaniesForTor(published).catch((error) => {
    console.error("notifyCompaniesForTor failed", error)
  })

  return published
}
