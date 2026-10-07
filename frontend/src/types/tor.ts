import type { LocalizedList, LocalizedText } from "@/types/localized"
import type { QualificationCriteria } from "@/types/qualification-criteria"

export type TorProjectScale = "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE"

export type TorPriority = "HIGH" | "MEDIUM" | "LOW"

export type TorProcurementMethod =
  | "e-bidding"
  | "e-market"
  | "selective"
  | "specific"
  | "price-agreement"

/** Mirrors PROCUREMENT_STATUSES in backend/src/models/tor-fields.schema.ts. */
/**
 * One announcement in a project's history, as the e-GP feed published it.
 *
 * Mirrors announcementLinkSchema in backend/src/models/tor-fields.schema.ts.
 * `announceType` is the CGD code — B0 the tender, D0 the invitation, W0 the
 * winner, and so on — which is what the UI labels it by.
 */
export type TorAnnouncement = {
  announceType: string
  announceLabel: string
  url: string
  publishedDate: string
  title: string
}

export type TorProcurementStatus =
  | "draft"
  | "open"
  | "closing-soon"
  | "closed"
  | "awarded"
  | "cancelled"
  | "changed"
  | "winner-cancelled"
  | "winner-revised"

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
  /** Shared vocabulary slug; always equal to `criteria.type`. */
  key?: QualificationCriteria["type"]
  requirement: LocalizedText
  torCriteria: LocalizedText
  autoCheckable: boolean
  criteria?: QualificationCriteria
}

export type TorStepCode =
  | "P0" // แผนงาน
  | "15" // ราคากลาง
  | "B0" // ร่าง TOR
  | "D0" // ประกาศเชิญชวน
  | "D2" // แก้ไขประกาศเชิญชวน
  | "D1" // ยกเลิกประกาศเชิญชวน
  | "W0" // ประกาศผู้ชนะ
  | "W2" // แก้ไขประกาศผู้ชนะ
  | "W1" // ยกเลิกประกาศผู้ชนะ

export type TorStepStatus =
  | "completed"
  | "current"
  | "upcoming"
  | "amended"
  | "cancelled"

export type TorStepDocument = {
  id: string
  fileName: string
  name?: LocalizedText
  fileSize: string
  fileUrl: string
  publishDate?: string
  docType?: string
}

export type TorTimelineStep = {
  code: TorStepCode
  title: LocalizedText
  status: TorStepStatus
  date?: string
  deadline?: string
  daysRemaining?: number | null
  description?: LocalizedText
  document?: TorStepDocument
  documents?: TorStepDocument[]
  branchType?: "none" | "amendment" | "cancellation"
  branchFrom?: "D0" | "W0"
}

export type TorTimeline = {
  currentStepCode: TorStepCode
  latestFileName?: string
  steps: TorTimelineStep[]
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
  qualification?: TorQualificationCheck
  bookmarked: boolean
  deadline: string
  announcementDate: string
  sourceUrl: string
  /** Every announcement e-GP published for this project — see TorAnnouncement. */
  announcements?: TorAnnouncement[]
  summary: LocalizedText
  deliverables: LocalizedList
  techTags: string[]
  listTags: string[]
  financials: TorFinancials
  qualificationRequirements: TorQualificationRequirement[]
  timeline?: TorTimeline
}

export type QualificationStatus = "passed" | "failed" | "insufficient-data" | "manual-review"

/** The company-profile field that would answer a requirement. */
export type QualificationProfileField = {
  name: string
  label: LocalizedText
  wizardStep: string
  /** False when the profile has nothing usable in it for this announcement. */
  filled: boolean
}

export type TorQualificationRow = {
  requirementId: string
  key: QualificationCriteria["type"]
  keyLabel: LocalizedText
  requirement: LocalizedText
  torCriteria: LocalizedText
  companyValue: string | null
  passed: boolean | null
  status: QualificationStatus
  reason: LocalizedText
  autoCheckable: boolean
  /** True when the bidder is the one who has to answer this. */
  selfCheckable: boolean
  selfCheckAnswer: boolean | null
  /** An answer was stored, but against a version of the requirement that has since changed. */
  selfCheckStale: boolean
  criteriaFingerprint: string
  profileField: QualificationProfileField | null
}

export type TorQualificationCheck = {
  profileSetup: boolean
  /** Every automated criterion passed. Never affected by the bidder's own answers. */
  eligible: boolean
  /** Every requirement accounted for, whether verified by us or confirmed by the bidder. */
  readyToBid: boolean
  status: QualificationStatus
  requiresManualReview: boolean
  /** How many requirements the profile has no answer for. */
  missingProfileFields: number
  evaluatedAt: string
  rows: TorQualificationRow[]
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