import { localizedKey } from "@/models/localized.schema"
import { Tor, type TorDoc } from "@/models/Tor.model"
import type { TorDraftDoc } from "@/models/TorDraft.model"
import { notifyTorPublished } from "@/services/match-notification.service"

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
 * Writes the draft's content to `tors` and raises the notifications that
 * publication triggers (new match, high budget, deal-breaker). Every publish
 * path — the reviewer's button, auto-approval, the backfill script — goes
 * through here, so none of them can forget to notify. Callers record the
 * outcome on the draft and decide its review status.
 */
export async function publishDraft(draft: TorDraftDoc): Promise<TorDoc> {
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

  // What the live TOR required before this publish, so a requirement change
  // can be told apart from a first publication when alerts are raised.
  const previous = await Tor.findOne({ announcementNo: draft.announcementNo })
    .select("qualificationRequirements")
    .lean()

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

  // Awaited so a client refetching notifications right after the publish
  // cannot race ahead of the write. Alerts must never fail the publish.
  await notifyTorPublished(published, previous?.qualificationRequirements ?? null).catch(
    (error) => console.error("notifyTorPublished failed", error)
  )
  return published
}
