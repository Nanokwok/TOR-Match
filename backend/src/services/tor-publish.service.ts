import { localizedKey } from "@/models/localized.schema"
import { Tor, type TorDoc } from "@/models/Tor.model"
import type { TorDraftDoc } from "@/models/TorDraft.model"

/**
 * TORs publish with whatever was found — summary, deadline and the rest may
 * be empty and render as "not specified". Only a title and a department are
 * required, in either language: without them a TOR is a blank card that no
 * department filter can reach.
 */
const REQUIRED_FIELDS = ["title", "department"] as const

/** Returns the name of the first required field missing a value in every language, or null if all are present. */
export function missingRequiredField(draft: TorDraftDoc): string | null {
  for (const field of REQUIRED_FIELDS) {
    if (!localizedKey(draft[field])) return field
  }
  return null
}

/**
 * Copies a draft's allowlisted content into the live Tor collection.
 *
 * Copied field by field on purpose: the draft carries review bookkeeping
 * (aiConfidence, reviewStatus, ...) that must never reach the published
 * collection, and an allowlist keeps a future draft-only field from leaking
 * there by default. Upserts by announcementNo, so publishing a corrected
 * draft a second time updates the live TOR instead of duplicating it.
 */
export async function publishDraftContent(draft: TorDraftDoc): Promise<TorDoc> {
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

  const published = await Tor.findOneAndUpdate(
    { announcementNo: draft.announcementNo },
    { $set: content },
    { new: true, upsert: true, runValidators: true }
  )
  if (!published) {
    throw new Error(`Tor.findOneAndUpdate upsert unexpectedly returned null for ${draft.announcementNo}`)
  }
  return published
}
