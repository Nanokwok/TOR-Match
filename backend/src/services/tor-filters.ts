import { z } from "zod"

import { localizedKey } from "@/models/localized.schema"

export const detailFiltersSchema = z.object({
  projectScales: z.array(z.enum(["SMALL", "MEDIUM", "LARGE", "ENTERPRISE"])).default([]),
  durationPresets: z.array(z.enum(["under-3m", "3-6m", "6-12m", "1y-plus"])).default([]),
  budgetMinThb: z.string().default(""),
  budgetMaxThb: z.string().default(""),
  procurementMethods: z.array(z.enum(["e-bidding", "e-market", "selective", "specific", "price-agreement"])).default([]),
  deadlinePreset: z.enum(["any", "7-days", "30-days", "custom"]).default("any"),
  deadlineFrom: z.string().default(""),
  deadlineTo: z.string().default(""),
  fiscalYear: z.string().default("all"),
  localOffices: z.array(z.string()).default([]),
  /**
   * Show only announcements whose title reads like IT work.
   *
   * Ingestion stores every kind of procurement now, so without this a bidder
   * looking for software wades through refuse collection and hospital meals.
   */
  softwareOnly: z.boolean().default(false),
}).strict()
type TorDetailFilters = z.infer<typeof detailFiltersSchema>
type TorDurationPreset = TorDetailFilters["durationPresets"][number]
type FilterableTor = {
  projectScale: TorDetailFilters["projectScales"][number]
  durationDays: number
  budgetBaht: number
  method: TorDetailFilters["procurementMethods"][number]
  deadline: string
  announcementDate: string
  localOffice: { en: string }
  softwareRelated?: boolean
}

function matchesDurationPreset(days: number, preset: TorDurationPreset) {
  switch (preset) {
    case "under-3m":
      return days < 90
    case "3-6m":
      return days >= 90 && days < 180
    case "6-12m":
      return days >= 180 && days < 365
    case "1y-plus":
      return days >= 365
    default:
      return true
  }
}

function parseThb(value: string) {
  const cleaned = value.replace(/,/g, "").trim()
  if (!cleaned) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

type LocalizedField = { en?: string | null; th?: string | null } | null | undefined

/** The fields the listing's simple filters and keyword search read. */
export type SearchableTor = {
  announcementNo?: string | null
  status?: string | null
  budgetBaht?: number | null
  techTags?: readonly string[] | null
  title?: LocalizedField
  department?: LocalizedField
  localOffice?: LocalizedField
  summary?: LocalizedField
}

export type SimpleTorFilters = {
  status?: string
  /** `localizedKey()` of a department: its English name, or its Thai one for a Thai-only TOR. */
  department?: string
  budget?: { min: number; max: number }
  keyword?: string
}

const KEYWORD_FIELDS = ["title", "department", "localOffice", "summary"] as const

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Status, department, budget range and keyword, decided in this process.
 *
 * The listing used to hand these to MongoDB, which meant reading from the
 * database on every request; it now works from a cached list, so the same rules
 * run here. They follow the old queries exactly: a missing field never matches
 * (as in MongoDB, where `{ field: "" }` does not match an absent field), the
 * keyword is a case-insensitive literal (regex characters escaped), and it is
 * looked for in both locales of the text fields, in the announcement number and
 * in any tag.
 */
export function matchesSimpleFilters(tor: SearchableTor, filters: SimpleTorFilters): boolean {
  if (filters.status && tor.status !== filters.status) return false

  if (filters.department) {
    const english = tor.department?.en
    const thai = tor.department?.th
    if (!(english === filters.department || (english === "" && thai === filters.department))) return false
  }

  if (filters.budget) {
    const budget = tor.budgetBaht
    if (typeof budget !== "number" || budget < filters.budget.min || budget >= filters.budget.max) return false
  }

  const keyword = filters.keyword?.trim()
  if (keyword) {
    const pattern = new RegExp(escapeRegex(keyword), "i")
    const found =
      KEYWORD_FIELDS.some((field) => [tor[field]?.en, tor[field]?.th].some((text) => typeof text === "string" && pattern.test(text))) ||
      (typeof tor.announcementNo === "string" && pattern.test(tor.announcementNo)) ||
      (tor.techTags ?? []).some((tag) => typeof tag === "string" && pattern.test(tag))
    if (!found) return false
  }

  return true
}

export function matchesDetailFilters(
  tor: FilterableTor,
  detail?: TorDetailFilters | null
) {
  if (!detail) return true

  if (detail.softwareOnly && !tor.softwareRelated) return false

  if (
    detail.projectScales.length > 0 &&
    !detail.projectScales.includes(tor.projectScale)
  ) {
    return false
  }

  if (
    detail.durationPresets.length > 0 &&
    !detail.durationPresets.some((preset) =>
      matchesDurationPreset(tor.durationDays, preset)
    )
  ) {
    return false
  }

  const minBudget = parseThb(detail.budgetMinThb)
  const maxBudget = parseThb(detail.budgetMaxThb)
  if (minBudget != null && tor.budgetBaht < minBudget) return false
  if (maxBudget != null && tor.budgetBaht > maxBudget) return false

  if (
    detail.procurementMethods.length > 0 &&
    !detail.procurementMethods.includes(tor.method)
  ) {
    return false
  }

  const deadline = new Date(tor.deadline)
  const now = new Date()

  // No stated deadline can't satisfy a deadline filter. Without this, every
  // comparison against an Invalid Date is false and the TOR slips through.
  if (detail.deadlinePreset !== "any" && Number.isNaN(deadline.getTime())) {
    return false
  }

  if (detail.deadlinePreset === "7-days") {
    const limit = new Date(now)
    limit.setDate(limit.getDate() + 7)
    if (deadline < now || deadline > limit) return false
  } else if (detail.deadlinePreset === "30-days") {
    const limit = new Date(now)
    limit.setDate(limit.getDate() + 30)
    if (deadline < now || deadline > limit) return false
  } else if (detail.deadlinePreset === "custom") {
    if (detail.deadlineFrom) {
      const from = new Date(`${detail.deadlineFrom}T00:00:00`)
      if (deadline < from) return false
    }
    if (detail.deadlineTo) {
      const to = new Date(`${detail.deadlineTo}T23:59:59`)
      if (deadline > to) return false
    }
  }

  if (detail.fiscalYear !== "all") {
    const announced = new Date(tor.announcementDate)
    if (String(announced.getFullYear()) !== detail.fiscalYear) return false
  }

  if (
    detail.localOffices.length > 0 &&
    !detail.localOffices.includes(localizedKey(tor.localOffice))
  ) {
    return false
  }

  return true
}
