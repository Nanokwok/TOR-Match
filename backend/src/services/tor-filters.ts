import { z } from "zod"

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

export function matchesDetailFilters(
  tor: FilterableTor,
  detail?: TorDetailFilters | null
) {
  if (!detail) return true

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
    !detail.localOffices.includes(tor.localOffice.en)
  ) {
    return false
  }

  return true
}
