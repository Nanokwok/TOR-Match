import { PROJECT_SCALES } from "@/models/tor-fields.schema"
import { ANNOUNCE_TYPES, type AnnounceType } from "@/scraper/egp-rss"
import type { TorExtraction } from "@/scraper/extract"
import type { StoredQualification } from "@/scraper/qualification-repair"

/**
 * Decides which of a new extraction's fields may overwrite what is stored.
 *
 * A project is announced several times, and the announcements do not say the
 * same things. The tender document (B0) is the only one that states the bidder
 * qualifications, the scope, and the payment milestones; the invitation (D0) is
 * two pages that defer all of that but state the closing date nobody else
 * gives. Letting a later extraction write every field — which is what the
 * pipeline used to do — meant a notice arriving a fortnight after the tender
 * replaced twenty real qualification rows with "คุณสมบัติให้เป็นไปตามเอกสาร
 * ประกวดราคา", and reset a reviewer's corrections along with them.
 *
 * So each field names where it may come from, and anything a human has edited
 * is left alone entirely.
 */

/** The announcement an extraction read, which decides what it may overwrite. */
export type MergeSource = AnnounceType

export type MergeContext = {
  from: MergeSource
  /**
   * Whether the documents read actually contained a tender, rather than only
   * the two-page notice. A D0 sometimes attaches the full tender, in which case
   * it is as authoritative as a B0 — see carriesFullTender in tor-documents.ts.
   */
  fullTender: boolean
  /** Used when the documents themselves state no announcement date. */
  publishedDate: string
  /** Fields a reviewer has edited by hand; never overwritten by a model. */
  lockedFields?: readonly string[]
  /** `approved` means a human has signed this draft off. */
  reviewStatus?: string
}

/** What extractTorFromPdf returns: the model's fields, with repaired qualifications. */
export type ExtractedTor = Omit<TorExtraction, "qualificationRequirements"> & {
  qualificationRequirements: StoredQualification[]
}

export type StoredTorFields = {
  medianPriceSource?: string
  financials?: { medianPriceBaht?: number }
}

/** Fields a signed-off draft still accepts: facts the feed owns, not content. */
const SURVIVES_APPROVAL = new Set(["deadline", "announcementDate", "status", "announcements"])

/** Announcements whose metadata (dates, budget, office, method) is authoritative. */
const METADATA_SOURCES = new Set<AnnounceType>([
  ANNOUNCE_TYPES.draft,
  ANNOUNCE_TYPES.invitation,
  ANNOUNCE_TYPES.invitationChanged,
])

/** Announcements that can state a closing date. */
const DEADLINE_SOURCES = new Set<AnnounceType>([
  ANNOUNCE_TYPES.invitation,
  ANNOUNCE_TYPES.invitationChanged,
])

/** The bands the extraction prompt is given, applied here so the two agree. */
export function scaleForBudget(budgetBaht: number): (typeof PROJECT_SCALES)[number] {
  if (budgetBaht < 5_000_000) return "SMALL"
  if (budgetBaht < 20_000_000) return "MEDIUM"
  if (budgetBaht <= 100_000_000) return "LARGE"
  return "ENTERPRISE"
}

/**
 * Builds the `$set` payload for one extraction.
 *
 * Fields it leaves out keep whatever is stored — that is the point: an omitted
 * field is one this announcement had no business restating.
 */
export function mergeExtraction(
  stored: StoredTorFields | null,
  incoming: ExtractedTor,
  ctx: MergeContext
): Record<string, unknown> {
  const isTender = ctx.from === ANNOUNCE_TYPES.draft || ctx.fullTender
  const statesMetadata = METADATA_SOURCES.has(ctx.from)
  const set: Record<string, unknown> = {}

  // Content only a tender document can speak for. A notice that defers the
  // qualifications must not blank the ones the tender gave us.
  if (isTender) {
    set.title = incoming.title
    set.department = incoming.department
    set.summary = incoming.summary
    set.deliverables = incoming.deliverables
    set.durationDays = incoming.durationDays
    set.techTags = incoming.techTags
    set.listTags = incoming.listTags
    set.qualificationRequirements = incoming.qualificationRequirements
  }

  if (statesMetadata) {
    if (incoming.localOffice?.th || incoming.localOffice?.en) set.localOffice = incoming.localOffice
    set.announcementDate = incoming.announcementDate || ctx.publishedDate

    // A tender states the budget it was drafted against; a later notice states
    // the figure actually advertised, which wins when it is stated at all.
    if (ctx.from === ANNOUNCE_TYPES.draft || incoming.budgetBaht > 0) {
      set.budgetBaht = incoming.budgetBaht
    }
    if (ctx.from === ANNOUNCE_TYPES.draft || incoming.method) {
      set.method = incoming.method
    }
  }

  if (DEADLINE_SOURCES.has(ctx.from) && incoming.deadline) {
    set.deadline = incoming.deadline
  }

  // Derived, never taken from the model: the bands are a rule about money, and
  // a scale that disagrees with the budget on screen is a bug a reader can see.
  const budget = (set.budgetBaht as number | undefined) ?? incoming.budgetBaht
  if (budget > 0) set.projectScale = scaleForBudget(budget)

  // The official median price comes from the ราคากลาง announcement (บก.06).
  // Once that has spoken, a figure read out of a tender does not overrule it.
  const medianPriceIsOfficial = stored?.medianPriceSource === ANNOUNCE_TYPES.medianPrice
  const medianPriceBaht = medianPriceIsOfficial
    ? stored?.financials?.medianPriceBaht ?? incoming.medianPriceBaht
    : incoming.medianPriceBaht

  if (isTender || statesMetadata) {
    set.financials = {
      totalBudgetBaht: budget,
      medianPriceBaht,
      method: (set.method as string | undefined) ?? incoming.method,
      milestones: isTender ? incoming.milestones : undefined,
    }
    // An omitted milestone list means "keep what is stored"; Mongoose would
    // otherwise write undefined and lose them.
    if (!isTender) delete (set.financials as Record<string, unknown>).milestones
  }

  // A human's corrections outrank every announcement.
  for (const field of ctx.lockedFields ?? []) delete set[field]

  if (ctx.reviewStatus === "approved") {
    for (const field of Object.keys(set)) {
      if (!SURVIVES_APPROVAL.has(field)) delete set[field]
    }
  }

  return set
}
