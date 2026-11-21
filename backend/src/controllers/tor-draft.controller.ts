import type { Request, Response } from "express"
import { isValidObjectId } from "mongoose"
import { z } from "zod"

import { TorDraft, type TorDraftDoc } from "@/models/TorDraft.model"
import {
  PROCUREMENT_METHODS,
  PROCUREMENT_STATUSES,
  PROJECT_SCALES,
} from "@/models/tor-fields.schema"
import { QUALIFICATION_KEYS } from "@/domain/qualification-taxonomy"
import { publishBlocker, publishDraft } from "@/services/tor-publish.service"
import { qualificationCriteriaSchema } from "@/validation/qualification"
import { downloadAllTorDocuments, type TorDocument } from "@/scraper/tor-documents"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"
import { logSecurityEvent } from "@/utils/security-logger"

/**
 * The admin review screen is a Thai editing surface — Thai is the site's
 * default language (see the frontend's TorReviewDetail). It renders one string
 * per localized field, plus both titles. Everything it sends back is therefore
 * the Thai side only, and any stored English has to survive the round trip —
 * see mergeLocalized below.
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
  key: z.enum(QUALIFICATION_KEYS).optional(),
  requirement: z.string(),
  torCriteria: z.string(),
  autoCheckable: z.boolean().optional(),
  /**
   * Validated against the criteria union below rather than here, so a reviewer
   * gets one clear message about the rule instead of a discriminated-union
   * parse error spanning eight branches.
   */
  criteria: z.unknown().optional(),
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
 * Takes the reviewer's Thai edit and keeps any stored English value.
 *
 * Without this every save through the review form would blank out `.en` (from
 * AI extraction or the seed) on every field but the title.
 *
 * An English value identical to the old Thai one is not a translation — it is
 * a copy an earlier English-only form wrote into the wrong locale — so it is
 * dropped rather than preserved.
 */
function mergeLocalized(existing: LocalizedText | undefined, th: string): LocalizedText {
  const en = existing?.en?.trim() ?? ""
  return { en: en && en !== existing?.th?.trim() ? en : "", th }
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
    // Deliverables have no stable key, so the English list is matched by
    // position. A reviewer who reorders or inserts Thai rows will misalign it;
    // the fix is a bilingual form, tracked for Phase 2.
    deliverables: {
      en: draft.deliverables?.en ?? [],
      th: input.deliverables,
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
      // An omitted field preserves what is stored, an explicit one overwrites —
      // the same rule mergeLocalized follows. Until this carried `criteria`,
      // the review screen's criteria editor saved nothing at all: every rule a
      // reviewer configured was overwritten with the stored value on save.
      const criteria = row.criteria ?? existing?.criteria
      const parsed = qualificationCriteriaSchema.safeParse(criteria)
      return {
        id: row.id,
        // `key` and `criteria.type` are one concept, so a configured rule names
        // its own key and cannot disagree with it.
        key: parsed.success ? parsed.data.type : (row.key ?? existing?.key ?? "manual"),
        requirement: mergeLocalized(existing?.requirement, row.requirement),
        torCriteria: mergeLocalized(existing?.torCriteria, row.torCriteria),
        autoCheckable: parsed.success ? parsed.data.type !== "manual" : false,
        criteria,
      }
    }),
  }
}

/** One string each, so a repeated parameter or `reviewStatus[$ne]=x` cannot reach the filter. */
const listQuerySchema = z.object({
  reviewStatus: z.string().max(100).optional(),
  department: z.string().max(300).optional(),
})

export const listTorDrafts = asyncHandler(async (req: Request, res: Response) => {
  const parsedQuery = listQuerySchema.safeParse(req.query)
  if (!parsedQuery.success) throw ApiError.badRequest("Invalid query")
  const { reviewStatus, department } = parsedQuery.data

  const filter: Record<string, unknown> = {}
  if (reviewStatus && reviewStatus !== "all") filter.reviewStatus = reviewStatus
  if (department && department !== "all") {
    filter.$or = [{ "department.th": department }, { "department.en": department }]
  }

  const items = await TorDraft.find(filter).sort({ createdAt: -1 })
  res.status(200).json({ items, total: items.length })
})

/** A malformed id is a draft that does not exist, not a server error. */
async function findDraftOrThrow(id: string) {
  const draft = isValidObjectId(id) ? await TorDraft.findById(id) : null
  if (!draft) throw ApiError.notFound("TOR draft not found")
  return draft
}

export const getTorDraftById = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await findDraftOrThrow(req.params.id))
})

export const updateTorDraft = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateDraftSchema.safeParse(req.body)
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid input", parsed.error.flatten())
  }

  const draft = await findDraftOrThrow(req.params.id)

  draft.set(draftUpdateFrom(draft, parsed.data))
  await draft.save()

  res.status(200).json(draft)
})

export const publishTorDraft = asyncHandler(async (req: Request, res: Response) => {
  const draft = await findDraftOrThrow(req.params.id)

  const blocker = publishBlocker(draft)
  if (blocker) throw ApiError.badRequest(`Cannot publish: ${blocker}`)

  const published = await publishDraft(draft)

  // The reviewer's verdict. Recording it is what makes the ingest treat the
  // published content as theirs: a later announcement may add a deadline to an
  // approved draft, but it cannot overwrite what the reviewer corrected.
  draft.set({
    reviewStatus: "approved",
    publishedTorId: published._id,
    publishedAt: new Date(),
    reviewedBy: isValidObjectId(req.user?.sub) ? req.user?.sub : null,
  })
  await draft.save()

  // Who published what, so an admin cannot later deny it (and a bad publish can be traced).
  logSecurityEvent({
    event: "TOR_PUBLISHED",
    req,
    userId: req.user?.sub,
    email: req.user?.email,
    details: { draftId: String(draft._id), announcementNo: draft.announcementNo },
  })

  res.status(200).json({ draft, tor: published })
})

type CachedDraftDocs = {
  expiresAt: number
  documents: TorDocument[]
}

const docsCache = new Map<string, CachedDraftDocs>()
const inFlightRequests = new Map<string, Promise<TorDocument[]>>()

async function getOrFetchDraftDocuments(draft: TorDraftDoc): Promise<TorDocument[]> {
  const cacheKey = draft._id.toString()
  const now = Date.now()
  const cached = docsCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.documents
  }

  const existingInFlight = inFlightRequests.get(cacheKey)
  if (existingInFlight) {
    return existingInFlight
  }

  const targetUrl = draft.pdfUrl || draft.invitationUrl
  if (!targetUrl) {
    return []
  }

  if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
    const fetchPromise = downloadAllTorDocuments([targetUrl])
      .then((docs) => {
        if (docs.length > 0) {
          docsCache.set(cacheKey, {
            expiresAt: Date.now() + 30 * 60 * 1000,
            documents: docs,
          })
          if (docsCache.size > 50) {
            const oldestKey = docsCache.keys().next().value
            if (oldestKey) docsCache.delete(oldestKey)
          }
        }
        return docs
      })
      .finally(() => {
        inFlightRequests.delete(cacheKey)
      })

    inFlightRequests.set(cacheKey, fetchPromise)
    return fetchPromise
  }

  return []
}

export const getTorDraftFiles = asyncHandler(async (req: Request, res: Response) => {
  const draft = await findDraftOrThrow(req.params.id)
  const targetUrl = draft.pdfUrl || draft.invitationUrl
  if (!targetUrl) {
    res.status(200).json({ files: [] })
    return
  }

  try {
    const docs = await getOrFetchDraftDocuments(draft)
    const files = docs.map((doc, index) => ({
      index,
      name: doc.name,
      sizeBytes: doc.pdf.byteLength,
    }))
    res.status(200).json({ files })
  } catch (err) {
    console.error(`getTorDraftFiles failed for draft ${draft._id}:`, err)
    throw ApiError.badRequest(`Could not retrieve document list: ${err instanceof Error ? err.message : String(err)}`)
  }
})

export const getTorDraftPdf = asyncHandler(async (req: Request, res: Response) => {
  const draft = await findDraftOrThrow(req.params.id)
  const targetUrl = draft.pdfUrl || draft.invitationUrl
  if (!targetUrl) {
    throw ApiError.notFound("No document attached to this draft")
  }

  if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
    try {
      const docs = await getOrFetchDraftDocuments(draft)
      if (!docs.length) {
        throw ApiError.notFound("No readable PDF document could be extracted")
      }

      const fileParam = Number(req.query.file ?? 0)
      const fileIndex = Number.isFinite(fileParam) && fileParam >= 0 && fileParam < docs.length ? fileParam : 0
      const selected = docs[fileIndex]

      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", `inline; filename="${selected.name || `${draft.announcementNo}.pdf`}"`)
      res.setHeader("Cache-Control", "private, max-age=3600")
      res.setHeader("X-Frame-Options", "SAMEORIGIN")
      res.status(200).send(selected.pdf)
      return
    } catch (err) {
      console.error(`getTorDraftPdf failed for draft ${draft._id}:`, err)
      throw ApiError.badRequest(`Could not retrieve document: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // A path on this site, not "//host" or "/\host", which a browser reads as another site.
  if (targetUrl.startsWith("/") && !targetUrl.startsWith("//") && !targetUrl.includes("\\")) {
    res.redirect(targetUrl)
    return
  }

  throw ApiError.badRequest("Invalid document URL format")
})
