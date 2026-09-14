"use server"

import { revalidatePath } from "next/cache"

import { getAdminToken } from "@/lib/admin-session"
import { ApiRequestError, apiFetch } from "@/lib/api-client"
import type {
  TorReviewDetail,
  TorReviewListItem,
  TorReviewStatus,
} from "@/types/tor-review"

/**
 * Reads and writes the TOR review queue (backend `tordrafts`).
 *
 * Drafts are what the scraper produces; publishing one copies it into the
 * live `tors` collection. Every call is admin-gated on the backend, so these
 * forward the JWT held in the admin session cookie.
 */

type LocalizedText = { en: string; th: string }
type LocalizedList = { en: string[]; th: string[] }

/** A TorDraft as the API serializes it. */
type BackendDraft = {
  _id: string
  announcementNo: string
  title: LocalizedText
  department: LocalizedText
  localOffice: LocalizedText
  summary: LocalizedText
  deliverables: LocalizedList
  budgetBaht: number
  projectScale: TorReviewDetail["projectScale"]
  durationDays: number
  method: TorReviewDetail["method"]
  status: TorReviewDetail["status"]
  deadline: string
  announcementDate: string
  sourceUrl: string
  pdfUrl: string
  techTags: string[]
  listTags: string[]
  aiConfidence: number
  reviewStatus: TorReviewStatus
  financials: {
    totalBudgetBaht: number
    medianPriceBaht: number
    milestones: {
      day: number
      milestoneNumber: number
      percent: number
      amountBaht: number
      deliverable: LocalizedText
    }[]
  }
  qualificationRequirements: {
    id: string
    requirement: LocalizedText
    torCriteria: LocalizedText
    autoCheckable: boolean
  }[]
}

export type AdminActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

function toListItem(draft: BackendDraft): TorReviewListItem {
  return {
    id: draft._id,
    announcementId: draft.announcementNo,
    projectTitle: draft.title.en || draft.title.th,
    department: draft.department.en,
    budgetBaht: draft.budgetBaht,
    aiConfidence: draft.aiConfidence,
    reviewStatus: draft.reviewStatus,
  }
}

function toDetail(draft: BackendDraft): TorReviewDetail {
  return {
    ...toListItem(draft),
    projectTitleEn: draft.title.en,
    projectTitleTh: draft.title.th,
    localOffice: draft.localOffice.en,
    projectScale: draft.projectScale,
    durationDays: draft.durationDays,
    method: draft.method,
    status: draft.status,
    deadline: draft.deadline,
    announcementDate: draft.announcementDate,
    sourceUrl: draft.sourceUrl,
    summary: draft.summary.en,
    deliverables: draft.deliverables?.en ?? [],
    techTags: draft.techTags,
    listTags: draft.listTags,
    medianPriceBaht: draft.financials.medianPriceBaht,
    milestones: draft.financials.milestones.map((milestone) => ({
      day: milestone.day,
      milestoneNumber: milestone.milestoneNumber,
      percent: milestone.percent,
      amountBaht: milestone.amountBaht,
      deliverable: milestone.deliverable.en,
    })),
    qualificationRequirements: draft.qualificationRequirements.map((row) => ({
      id: row.id,
      requirement: row.requirement.en,
      torCriteria: row.torCriteria.en,
      autoCheckable: row.autoCheckable,
    })),
    pdfUrl: draft.pdfUrl,
  }
}

/**
 * Only the English side goes back. The backend re-attaches the stored Thai
 * values field by field, so a save through this form never blanks them.
 */
function toBackendUpdate(detail: TorReviewDetail) {
  return {
    announcementNo: detail.announcementId,
    projectTitleEn: detail.projectTitleEn,
    projectTitleTh: detail.projectTitleTh,
    department: detail.department,
    localOffice: detail.localOffice,
    summary: detail.summary,
    deliverables: detail.deliverables,
    techTags: detail.techTags,
    listTags: detail.listTags,
    budgetBaht: detail.budgetBaht,
    medianPriceBaht: detail.medianPriceBaht,
    projectScale: detail.projectScale,
    method: detail.method,
    status: detail.status,
    durationDays: detail.durationDays,
    deadline: detail.deadline,
    announcementDate: detail.announcementDate,
    sourceUrl: detail.sourceUrl,
    milestones: detail.milestones,
    qualificationRequirements: detail.qualificationRequirements,
  }
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAdminToken()
  if (!token) throw new ApiRequestError(401, "Your admin session has expired. Sign in again.")

  return apiFetch<T>(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
  })
}

function messageFrom(error: unknown, context: string): string {
  if (error instanceof ApiRequestError) return error.message
  console.error(context, error)
  return "Something went wrong. Please try again."
}

/** Reads degrade to an empty list rather than throwing across the RSC boundary. */
export async function listTorReviewsAction(): Promise<TorReviewListItem[]> {
  try {
    const { items } = await adminFetch<{ items: BackendDraft[] }>("/tor-drafts")
    return items.map(toListItem)
  } catch (error) {
    console.error("listTorReviewsAction failed", error)
    return []
  }
}

export async function getTorReviewAction(id: string): Promise<TorReviewDetail | null> {
  try {
    return toDetail(await adminFetch<BackendDraft>(`/tor-drafts/${id}`))
  } catch (error) {
    console.error("getTorReviewAction failed", error)
    return null
  }
}

export async function saveTorReviewAction(
  detail: TorReviewDetail
): Promise<AdminActionResult<TorReviewDetail>> {
  try {
    const updated = await adminFetch<BackendDraft>(`/tor-drafts/${detail.id}`, {
      method: "PUT",
      body: JSON.stringify(toBackendUpdate(detail)),
    })
    revalidatePath(`/admin/tor-review/${detail.id}`)
    return { ok: true, data: toDetail(updated) }
  } catch (error) {
    return { ok: false, error: messageFrom(error, "saveTorReviewAction failed") }
  }
}

/** Saves the reviewer's edits, then copies the draft into the live TOR collection. */
export async function publishTorReviewAction(
  detail: TorReviewDetail
): Promise<AdminActionResult<TorReviewDetail>> {
  const saved = await saveTorReviewAction(detail)
  if (!saved.ok) return saved

  try {
    const { draft } = await adminFetch<{ draft: BackendDraft }>(
      `/tor-drafts/${detail.id}/publish`,
      { method: "POST" }
    )
    revalidatePath("/admin/tor-review")
    revalidatePath(`/admin/tor-review/${detail.id}`)
    return { ok: true, data: toDetail(draft) }
  } catch (error) {
    return { ok: false, error: messageFrom(error, "publishTorReviewAction failed") }
  }
}
