export type TorProjectScale = "SMALL" | "MEDIUM" | "LARGE"

export type TorProcurementMethod =
  | "e-bidding"
  | "e-market"
  | "selective"
  | "specific"

export type TorProcurementStatus =
  | "open"
  | "closing-soon"
  | "closed"
  | "awarded"

export type TorPaymentMilestone = {
  day: number
  milestoneNumber: number
  percent: number
  amountBaht: number
  deliverable: string
}

export type TorFinancials = {
  totalBudgetBaht: number
  medianPriceBaht: number
  method: TorProcurementMethod
  milestones: TorPaymentMilestone[]
}

export type TorQualificationRequirement = {
  id: string
  requirement: string
  torCriteria: string
}

export type Tor = {
  id: string
  announcementNo: string
  title: string
  department: string
  budgetBaht: number
  projectScale: TorProjectScale
  durationDays: number
  durationLabel: string
  method: TorProcurementMethod
  status: TorProcurementStatus
  eligible: boolean
  bookmarked: boolean
  deadline: string
  sourceUrl: string
  summary: string
  deliverables: string[]
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
    requirement: string
    torCriteria: string
    companyValue: string | null
    passed: boolean | null
  }[]
}

export type TorListQuery = {
  keyword?: string
  eligibleOnly?: boolean
  budgetRange?: string
  status?: TorProcurementStatus | "all"
  department?: string | "all"
}

export type TorListResult = {
  items: Tor[]
  total: number
}
