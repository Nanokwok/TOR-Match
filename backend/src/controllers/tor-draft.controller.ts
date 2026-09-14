import type { Request, Response } from "express"
import { z } from "zod"

import { ScrapeJob } from "@/models/ScrapeJob.model"
import { Tor } from "@/models/Tor.model"
import { AUTO_APPROVE_CONFIDENCE_THRESHOLD, TorDraft, type TorDraftDoc } from "@/models/TorDraft.model"
import {
  PROCUREMENT_METHODS,
  PROCUREMENT_STATUSES,
  PROJECT_SCALES,
} from "@/models/tor-fields.schema"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

/**
 * The admin review screen is an English editing surface (see the frontend's
 * TorReviewDetail): it renders one string per localized field, plus the Thai
 * title. Everything it sends back is therefore the English side only, and the
 * stored Thai side has to survive the round trip — see mergeLocalized below.
 */
const milestoneSchema = z.object({
  day: z.number(),
  milestoneNumber: z.number(),
  percent: z.number(),
  amountBaht: z.number(),
  deliverable: z.string(),
})

const qualificationSchema = z.object({
  id: z.string().min(1),
  requirement: z.string(),
  torCriteria: z.string(),
  autoCheckable: z.boolean().optional(),
})

const updateDraftSchema = z.object({
  announcementNo: z.string().trim().min(1),
  projectTitleEn: z.string(),
  projectTitleTh: z.string(),
  department: z.string(),
  localOffice: z.string(),
  summary: z.string(),
  deliverables: z.array(z.string()),
  techTags: z.array(z.string()),
  listTags: z.array(z.string()),
  budgetBaht: z.number(),
  medianPriceBaht: z.number(),
  projectScale: z.enum(PROJECT_SCALES),
  method: z.enum(PROCUREMENT_METHODS),
  status: z.enum(PROCUREMENT_STATUSES),
  durationDays: z.number(),
  deadline: z.string(),
  announcementDate: z.string(),
  sourceUrl: z.string(),
  milestones: z.array(milestoneSchema),
  qualificationRequirements: z.array(qualificationSchema),
})

type LocalizedText = { en: string; th: string }

/**
 * Keeps the stored Thai value while taking the reviewer's English edit.
 *
 * Without this every save through the review form would blank out `.th` on
 * every field but the title, silently destroying the Thai half of the record.
 */
function mergeLocalized(existing: LocalizedText | undefined, en: string): LocalizedText {
  return { en, th: existing?.th ?? "" }
}

function draftUpdateFrom(draft: TorDraftDoc, input: z.infer<typeof updateDraftSchema>) {
  const existingQualifications = new Map(
    draft.qualificationRequirements.map((row) => [row.id, row])
  )
  const existingMilestones = new Map(
    draft.financials.milestones.map((row) => [row.milestoneNumber, row])
  )

  return {
    announcementNo: input.announcementNo,
    // The only field the form edits in both locales.
    title: { en: input.projectTitleEn, th: input.projectTitleTh },
    department: mergeLocalized(draft.department, input.department),
    localOffice: mergeLocalized(draft.localOffice, input.localOffice),
    summary: mergeLocalized(draft.summary, input.summary),
    // Deliverables have no stable key, so the Thai list is matched by position.
    // A reviewer who reorders or inserts English rows will misalign it; the
    // fix is a bilingual form, tracked for Phase 2.
    deliverables: {
      en: input.deliverables,
      th: draft.deliverables?.th ?? [],
    },
    techTags: input.techTags,
    listTags: input.listTags,
    budgetBaht: input.budgetBaht,
    projectScale: input.projectScale,
    durationDays: input.durationDays,
    method: input.method,
    status: input.status,
    deadline: input.deadline,
    announcementDate: input.announcementDate,
    sourceUrl: input.sourceUrl,
    financials: {
      totalBudgetBaht: input.budgetBaht,
      medianPriceBaht: input.medianPriceBaht,
      // Kept in step with the top-level method: the schema stores both and
      // enforces neither.
      method: input.method,
      milestones: input.milestones.map((milestone) => ({
        day: milestone.day,
        milestoneNumber: milestone.milestoneNumber,
        percent: milestone.percent,
        amountBaht: milestone.amountBaht,
        deliverable: mergeLocalized(
          existingMilestones.get(milestone.milestoneNumber)?.deliverable,
          milestone.deliverable
        ),
      })),
    },
    qualificationRequirements: input.qualificationRequirements.map((row) => {
      const existing = existingQualifications.get(row.id)
      return {
        id: row.id,
        requirement: mergeLocalized(existing?.requirement, row.requirement),
        torCriteria: mergeLocalized(existing?.torCriteria, row.torCriteria),
        autoCheckable: row.autoCheckable ?? existing?.autoCheckable ?? false,
      }
    }),
  }
}

export const listTorDrafts = asyncHandler(async (req: Request, res: Response) => {
  const { reviewStatus, department } = req.query as Record<string, string | undefined>

  const filter: Record<string, unknown> = {}
  if (reviewStatus && reviewStatus !== "all") filter.reviewStatus = reviewStatus
  if (department && department !== "all") filter["department.en"] = department

  const items = await TorDraft.find(filter).sort({ createdAt: -1 })
  res.status(200).json({ items, total: items.length })
})

export const getTorDraftById = asyncHandler(async (req: Request, res: Response) => {
  const draft = await TorDraft.findById(req.params.id)
  if (!draft) throw ApiError.notFound("TOR draft not found")
  res.status(200).json(draft)
})

export const updateTorDraft = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateDraftSchema.safeParse(req.body)
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid input", parsed.error.flatten())
  }

  const draft = await TorDraft.findById(req.params.id)
  if (!draft) throw ApiError.notFound("TOR draft not found")

  draft.set(draftUpdateFrom(draft, parsed.data))
  await draft.save()

  res.status(200).json(draft)
})

export const publishTorDraft = asyncHandler(async (req: Request, res: Response) => {
  const draft = await TorDraft.findById(req.params.id)
  if (!draft) throw ApiError.notFound("TOR draft not found")

  // A blank English value would drop the TOR out of the department and
  // local-office filter lists, which de-duplicate on `.en` — catch it here
  // rather than letting it disappear from browse after publishing.
  for (const field of ["title", "department", "localOffice", "summary"] as const) {
    if (!draft[field]?.en?.trim()) {
      throw ApiError.badRequest(`Cannot publish: ${field} is missing its English value`)
    }
  }

  // Copied field by field on purpose: the draft carries review bookkeeping
  // (aiConfidence, sourceJobId, ...) that must never reach the published
  // collection, and an allowlist keeps a future draft-only field from
  // leaking there by default.
  const content = {
    announcementNo: draft.announcementNo,
    title: draft.title,
    department: draft.department,
    localOffice: draft.localOffice,
    budgetBaht: draft.budgetBaht,
    projectScale: draft.projectScale,
    durationDays: draft.durationDays,
    method: draft.method,
    status: draft.status,
    deadline: draft.deadline,
    announcementDate: draft.announcementDate,
    sourceUrl: draft.sourceUrl,
    summary: draft.summary,
    deliverables: draft.deliverables,
    techTags: draft.techTags,
    listTags: draft.listTags,
    financials: draft.financials,
    qualificationRequirements: draft.qualificationRequirements,
  }

  // Same upsert-by-announcementNo the seed uses, so re-publishing a corrected
  // draft updates the live TOR instead of duplicating it.
  const published = await Tor.findOneAndUpdate(
    { announcementNo: draft.announcementNo },
    { $set: content },
    { new: true, upsert: true, runValidators: true }
  )

  draft.set({
    reviewStatus: "approved",
    publishedTorId: published?._id ?? null,
    publishedAt: new Date(),
  })
  await draft.save()

  res.status(200).json({ draft, tor: published })
})

export const listScrapeJobs = asyncHandler(async (_req: Request, res: Response) => {
  const items = await ScrapeJob.find().sort({ createdAt: -1 }).limit(200)

  const [pending, failed] = await Promise.all([
    ScrapeJob.countDocuments({ status: "running" }),
    ScrapeJob.countDocuments({ status: "failure" }),
  ])

  res.status(200).json({
    items,
    total: items.length,
    stats: { pending, failed, autoApproveThreshold: AUTO_APPROVE_CONFIDENCE_THRESHOLD },
  })
})
