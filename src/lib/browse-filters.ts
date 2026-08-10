import type {
  Tor,
  TorDeadlinePreset,
  TorDetailFilters,
  TorDurationPreset,
  TorProcurementMethod,
  TorProjectScale,
} from "@/types/tor"

export const EMPTY_DETAIL_FILTERS: TorDetailFilters = {
  projectScales: [],
  durationPresets: [],
  budgetMinThb: "",
  budgetMaxThb: "",
  procurementMethods: [],
  deadlinePreset: "any",
  deadlineFrom: "",
  deadlineTo: "",
  fiscalYear: "all",
  localOffices: [],
}

export const PROJECT_SCALE_OPTIONS: {
  value: TorProjectScale
  label: string
}[] = [
  { value: "SMALL", label: "Small" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LARGE", label: "Large" },
  { value: "ENTERPRISE", label: "Enterprise" },
]

export const DURATION_PRESET_OPTIONS: {
  value: TorDurationPreset
  label: string
}[] = [
  { value: "under-3m", label: "< 3 Months" },
  { value: "3-6m", label: "3–6 Months" },
  { value: "6-12m", label: "6–12 Months" },
  { value: "1y-plus", label: "1+ Year" },
]

export const PROCUREMENT_METHOD_OPTIONS: {
  value: TorProcurementMethod
  label: string
}[] = [
  { value: "e-bidding", label: "e-bidding" },
  { value: "specific", label: "Specific Method" },
  { value: "selective", label: "Selection Method" },
  { value: "price-agreement", label: "Price Agreement" },
]

export const DEADLINE_PRESET_OPTIONS: {
  value: TorDeadlinePreset
  label: string
}[] = [
  { value: "any", label: "Any deadline" },
  { value: "7-days", label: "Closing in 7 Days" },
  { value: "30-days", label: "Closing in 30 Days" },
  { value: "custom", label: "Custom Date Range" },
]

export const FISCAL_YEAR_OPTIONS = [
  { value: "all", label: "All years" },
  { value: "2026", label: "FY 2026" },
  { value: "2025", label: "FY 2025" },
  { value: "2024", label: "FY 2024" },
  { value: "2023", label: "FY 2023" },
] as const

export function cloneDetailFilters(
  filters: TorDetailFilters
): TorDetailFilters {
  return {
    ...filters,
    projectScales: [...filters.projectScales],
    durationPresets: [...filters.durationPresets],
    procurementMethods: [...filters.procurementMethods],
    localOffices: [...filters.localOffices],
  }
}

export function countActiveDetailFilters(filters: TorDetailFilters): number {
  let count = 0
  if (filters.projectScales.length > 0) count += 1
  if (filters.durationPresets.length > 0) count += 1
  if (filters.budgetMinThb.trim() || filters.budgetMaxThb.trim()) count += 1
  if (filters.procurementMethods.length > 0) count += 1
  if (filters.deadlinePreset !== "any") count += 1
  if (filters.fiscalYear !== "all") count += 1
  if (filters.localOffices.length > 0) count += 1
  return count
}

export function getActiveDetailFilterChips(
  filters: TorDetailFilters
): { id: string; label: string }[] {
  const chips: { id: string; label: string }[] = []

  if (filters.projectScales.length > 0) {
    chips.push({
      id: "scale",
      label: `Scale: ${filters.projectScales
        .map(
          (value) =>
            PROJECT_SCALE_OPTIONS.find((option) => option.value === value)
              ?.label ?? value
        )
        .join(", ")}`,
    })
  }

  if (filters.durationPresets.length > 0) {
    chips.push({
      id: "duration",
      label: `Duration: ${filters.durationPresets
        .map(
          (value) =>
            DURATION_PRESET_OPTIONS.find((option) => option.value === value)
              ?.label ?? value
        )
        .join(", ")}`,
    })
  }

  if (filters.budgetMinThb.trim() || filters.budgetMaxThb.trim()) {
    const min = filters.budgetMinThb.trim() || "0"
    const max = filters.budgetMaxThb.trim() || "∞"
    chips.push({ id: "budget", label: `Budget: ${min}–${max} THB` })
  }

  if (filters.procurementMethods.length > 0) {
    chips.push({
      id: "method",
      label: `Method: ${filters.procurementMethods
        .map(
          (value) =>
            PROCUREMENT_METHOD_OPTIONS.find((option) => option.value === value)
              ?.label ?? value
        )
        .join(", ")}`,
    })
  }

  if (filters.deadlinePreset === "7-days") {
    chips.push({ id: "deadline", label: "Closing in 7 Days" })
  } else if (filters.deadlinePreset === "30-days") {
    chips.push({ id: "deadline", label: "Closing in 30 Days" })
  } else if (filters.deadlinePreset === "custom") {
    chips.push({
      id: "deadline",
      label: `Deadline: ${filters.deadlineFrom || "…"} → ${filters.deadlineTo || "…"}`,
    })
  }

  if (filters.fiscalYear !== "all") {
    chips.push({ id: "fy", label: `FY ${filters.fiscalYear}` })
  }

  if (filters.localOffices.length > 0) {
    chips.push({
      id: "office",
      label:
        filters.localOffices.length === 1
          ? filters.localOffices[0]
          : `${filters.localOffices.length} local offices`,
    })
  }

  return chips
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
  tor: Tor,
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
    !detail.localOffices.includes(tor.localOffice)
  ) {
    return false
  }

  return true
}
