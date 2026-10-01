import { Tor, type TorDoc } from "@/models/Tor.model"
import type { TorDraftDoc } from "@/models/TorDraft.model"

/**
 * A blank English value would drop the TOR out of the department and
 * local-office filter lists, which de-duplicate on `.en` — check this before
 * publishing rather than letting it disappear from browse afterward.
 */
const REQUIRED_ENGLISH_FIELDS = ["title", "department", "localOffice", "summary"] as const

/** Returns the name of the first required field missing its English value, or null if all are present. */
export function missingRequiredEnglishField(draft: TorDraftDoc): string | null {
  for (const field of REQUIRED_ENGLISH_FIELDS) {
    if (!draft[field]?.en?.trim()) return field
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
