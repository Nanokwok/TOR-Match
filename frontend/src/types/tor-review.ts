import type {
  TorPaymentMilestone,
  TorProcurementMethod,
  TorProcurementStatus,
  TorProjectScale,
  TorQualificationRequirement,
} from "@/types/tor"

/**
 * Shapes for the admin TOR review queue.
 *
 * The review screen is an editing form, so it works with flat strings rather
 * than LocalizedText: English is the editing surface and the Thai title is
 * carried alongside in `projectTitleTh`. The Thai side of every other field
 * still exists in the database — the backend merges it back on save so an edit
 * through this form cannot erase it.
 */

export type ReviewMilestone = Omit<TorPaymentMilestone, "deliverable"> & {
  deliverable: string
}

export type ReviewQualification = Omit<
  TorQualificationRequirement,
  "requirement" | "torCriteria"
> & {
  requirement: string
  torCriteria: string
}

export type TorReviewStatus = "need-review" | "auto-approved" | "approved"

export type TorReviewConfidenceLevel = "high" | "medium" | "low"

export type TorReviewListItem = {
  id: string
  announcementId: string
  projectTitle: string
  department: string
  budgetBaht: number
  aiConfidence: number
  reviewStatus: TorReviewStatus
}

export type TorReviewDetail = TorReviewListItem & {
  projectTitleTh: string
  projectTitleEn: string
  localOffice: string
  projectScale: TorProjectScale
  durationDays: number
  method: TorProcurementMethod
  status: TorProcurementStatus
  deadline: string
  announcementDate: string
  sourceUrl: string
  summary: string
  deliverables: string[]
  techTags: string[]
  listTags: string[]
  medianPriceBaht: number
  milestones: ReviewMilestone[]
  qualificationRequirements: ReviewQualification[]
  pdfUrl: string
}

export const AUTO_APPROVE_CONFIDENCE_THRESHOLD = 90

export function confidenceLevel(value: number): TorReviewConfidenceLevel {
  if (value >= AUTO_APPROVE_CONFIDENCE_THRESHOLD) return "high"
  if (value >= 70) return "medium"
  return "low"
}

export function createEmptyMilestone(
  milestoneNumber: number,
  budgetBaht: number
): ReviewMilestone {
  const percent = 10
  return {
    day: milestoneNumber * 30,
    milestoneNumber,
    percent,
    amountBaht: Math.round((budgetBaht * percent) / 100),
    deliverable: "",
  }
}

export function createEmptyQualification(): ReviewQualification {
  return {
    // Client-side only. The backend keys the Thai side of an existing row on
    // this id, so a row added here starts with no Thai counterpart — which is
    // correct, since a reviewer typing a new requirement has only written English.
    id: `req-${Math.random().toString(36).slice(2, 8)}`,
    requirement: "",
    torCriteria: "",
    autoCheckable: false,
  }
}
