import { getMockTors } from "@/server/db/mock/tors"
import type { TorSeed } from "@/server/db/mock/tor-translations"
import type {
  Tor,
  TorProcurementMethod,
  TorProcurementStatus,
  TorProjectScale,
} from "@/types/tor"

/**
 * The admin review screen is an editing form, so it works with flat strings
 * rather than {@link LocalizedText}. English is the editing surface; the Thai
 * title is carried alongside it in `projectTitleTh`.
 */
export type ReviewMilestone = TorSeed["financials"]["milestones"][number]
export type ReviewQualification = TorSeed["qualificationRequirements"][number]

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

export const MOCK_TOR_PDF_PATH =
  "C_TOR_YYY_Digital_Multimedia_1.pdf" as const

export const MOCK_TOR_PDF_URL = `/admin/api/mock-tor-pdf` as const

/** Demo review metadata keyed by browse TOR id. */
const reviewMetaByTorId: Record<
  string,
  { aiConfidence: number; reviewStatus: TorReviewStatus; titleTh: string }
> = {
  "tor-001": {
    aiConfidence: 72,
    reviewStatus: "need-review",
    titleTh: "ระบบติดตามการจัดซื้อจัดจ้างและงบประมาณ กรุงเทพมหานคร",
  },
  "tor-002": {
    aiConfidence: 94,
    reviewStatus: "auto-approved",
    titleTh: "แพลตฟอร์มวิเคราะห์การจราจรสมาร์ทซิตี้",
  },
  "tor-003": {
    aiConfidence: 88,
    reviewStatus: "need-review",
    titleTh: "ระบบเชื่อมโยงเวชระเบียนดิจิทัลโรงพยาบาลในสังกัด",
  },
  "tor-004": {
    aiConfidence: 96,
    reviewStatus: "approved",
    titleTh: "ระบบจัดการเนื้อหาการเรียนรู้ออนไลน์สำหรับโรงเรียน",
  },
  "tor-005": {
    aiConfidence: 91,
    reviewStatus: "auto-approved",
    titleTh: "แดชบอร์ดเซ็นเซอร์สิ่งแวดล้อมและระบบแจ้งเตือน",
  },
  "tor-006": {
    aiConfidence: 65,
    reviewStatus: "need-review",
    titleTh: "ออกแบบแอปชำระภาษีท้องถิ่นใหม่",
  },
  "tor-007": {
    aiConfidence: 83,
    reviewStatus: "need-review",
    titleTh: "ระบบเตือนภัยน้ำท่วมและระบายน้ำอัจฉริยะ",
  },
  "tor-008": {
    aiConfidence: 97,
    reviewStatus: "approved",
    titleTh: "ระบบยืนยันคุณวุฒิครู",
  },
}

function defaultReviewMeta(tor: Tor, index: number) {
  const aiConfidence = 60 + ((index * 7) % 40)
  const reviewStatus: TorReviewStatus =
    aiConfidence >= AUTO_APPROVE_CONFIDENCE_THRESHOLD
      ? "auto-approved"
      : "need-review"
  return {
    aiConfidence,
    reviewStatus,
    titleTh: tor.title.th,
  }
}

function toReviewListItem(tor: Tor, index: number): TorReviewListItem {
  const meta = reviewMetaByTorId[tor.id] ?? defaultReviewMeta(tor, index)
  return {
    id: tor.id,
    announcementId: tor.announcementNo,
    projectTitle: tor.title.en,
    department: tor.department.en,
    budgetBaht: tor.budgetBaht,
    aiConfidence: meta.aiConfidence,
    reviewStatus: meta.reviewStatus,
  }
}

function toReviewDetail(tor: Tor, index: number): TorReviewDetail {
  const list = toReviewListItem(tor, index)
  const meta = reviewMetaByTorId[tor.id] ?? defaultReviewMeta(tor, index)

  return {
    ...list,
    projectTitleTh: meta.titleTh,
    projectTitleEn: tor.title.en,
    localOffice: tor.localOffice.en,
    projectScale: tor.projectScale,
    durationDays: tor.durationDays,
    method: tor.method,
    status: tor.status,
    deadline: tor.deadline,
    announcementDate: tor.announcementDate,
    sourceUrl: tor.sourceUrl,
    summary: tor.summary.en,
    deliverables: [...tor.deliverables.en],
    techTags: [...tor.techTags],
    listTags: [...tor.listTags],
    medianPriceBaht: tor.financials.medianPriceBaht,
    milestones: tor.financials.milestones.map((item) => ({
      ...item,
      deliverable: item.deliverable.en,
    })),
    qualificationRequirements: tor.qualificationRequirements.map((item) => ({
      ...item,
      requirement: item.requirement.en,
      torCriteria: item.torCriteria.en,
    })),
    pdfUrl: MOCK_TOR_PDF_URL,
  }
}

export function listTorReviews(): TorReviewListItem[] {
  return getMockTors().map(toReviewListItem)
}

export function getTorReviewById(id: string): TorReviewDetail | null {
  const tors = getMockTors()
  const index = tors.findIndex((tor) => tor.id === id)
  if (index < 0) return null
  return toReviewDetail(tors[index], index)
}

export const torReviewDepartments = Array.from(
  new Set(getMockTors().map((tor) => tor.department.en))
).sort()

export function confidenceLevel(
  aiConfidence: number
): TorReviewConfidenceLevel {
  if (aiConfidence >= AUTO_APPROVE_CONFIDENCE_THRESHOLD) return "high"
  if (aiConfidence >= 70) return "medium"
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
    id: `req-${Math.random().toString(36).slice(2, 8)}`,
    requirement: "",
    torCriteria: "",
    autoCheckable: false,
  }
}
