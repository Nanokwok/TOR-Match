import type { LocalizedList, LocalizedText } from "@/types/localized"

export type TorProjectScale = "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE"

export type TorPriority = "HIGH" | "MEDIUM" | "LOW"

export type TorProcurementMethod =
  | "e-bidding"
  | "e-market"
  | "selective"
  | "specific"
  | "price-agreement"

export type TorProcurementStatus =
  | "open"
  | "closing-soon"
  | "closed"
  | "awarded"

export type TorDurationPreset =
  | "under-3m"
  | "3-6m"
  | "6-12m"
  | "1y-plus"

export type TorDeadlinePreset = "any" | "7-days" | "30-days" | "custom"

export type TorPaymentMilestone = {
  day: number
  milestoneNumber: number
  percent: number
  amountBaht: number
  deliverable: LocalizedText
}

export type TorFinancials = {
  totalBudgetBaht: number
  medianPriceBaht: number
  method: TorProcurementMethod
  milestones: TorPaymentMilestone[]
}

export type TorQualificationRequirement = {
  id: string
  requirement: LocalizedText
  torCriteria: LocalizedText
  /** When true, eligibility can be checked against the company profile. */
  autoCheckable: boolean
}

export type Tor = {
  id: string
  announcementNo: string
  title: LocalizedText
  department: LocalizedText
  localOffice: LocalizedText
  budgetBaht: number
  projectScale: TorProjectScale
  /** Canonical contract length. Render with `formatDuration(durationDays, locale)`. */
  durationDays: number
  method: TorProcurementMethod
  status: TorProcurementStatus
  eligible: boolean
  bookmarked: boolean
  deadline: string
  announcementDate: string
  sourceUrl: string
  summary: LocalizedText
  deliverables: LocalizedList
  techTags: string[]
  listTags: string[]
  financials: TorFinancials
  qualificationRequirements: TorQualificationRequirement[]
}

export type CompanyProfileMatch = {
  requirementId: string
  displayValue: string
  passed: boolean
}

export type CompanyProfile = {
  id: string
  name: string
  matches: CompanyProfileMatch[]
}

export type TorQualificationCheck = {
  profileSetup: boolean
  rows: {
    requirement: LocalizedText
    torCriteria: LocalizedText
    companyValue: string | null
    passed: boolean | null
    autoCheckable: boolean
  }[]
}

export type TorDetailFilters = {
  projectScales: TorProjectScale[]
  durationPresets: TorDurationPreset[]
  budgetMinThb: string
  budgetMaxThb: string
  procurementMethods: TorProcurementMethod[]
  deadlinePreset: TorDeadlinePreset
  deadlineFrom: string
  deadlineTo: string
  fiscalYear: string
  localOffices: string[]
}

export type TorListQuery = {
  keyword?: string
  eligibleOnly?: boolean
  budgetRange?: string
  status?: TorProcurementStatus | "all"
  department?: string | "all"
  detail?: TorDetailFilters
}

export type TorListResult = {
  items: Tor[]
  total: number
}