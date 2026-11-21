import type { Request, Response } from "express"
import { isValidObjectId, type Types } from "mongoose"
import { z } from "zod"
import { Company } from "@/models/Company.model"
import { QualificationSelfCheck } from "@/models/QualificationSelfCheck.model"
import { localizedKey } from "@/models/localized.schema"
import { matchCompanyToTor, type SelfCheckEntry } from "@/services/qualification.service"
import { detailFiltersSchema, matchesDetailFilters, matchesSimpleFilters, type SimpleTorFilters } from "@/services/tor-filters"
import { torListCache } from "@/services/tor-cache.service"
import { Tor } from "@/models/Tor.model"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"
import { resolveTorSource } from "@/domain/tor-source"
import { paginate } from "@/utils/paginate"
import { DEFAULT_TOR_SORT, isOpenForBids, isTorSort, sortTors } from "@/utils/tor-listing"

const BUDGET_RANGES: Record<string, { min: number; max: number }> = {
  "under-3m": { min: 0, max: 3_000_000 },
  "3m-6m": { min: 3_000_000, max: 6_000_000 },
  "6m-10m": { min: 6_000_000, max: 10_000_000 },
  "over-10m": { min: 10_000_000, max: Number.POSITIVE_INFINITY },
}

/**
 * The company's own answers for these TORs, keyed by TOR id.
 *
 * Answers only affect what a bidder is shown, never `eligible` — see
 * qualification.service — so an anonymous or profile-less caller simply gets
 * an empty map rather than a different code path.
 */
async function selfChecksByTor(companyId: Types.ObjectId | undefined, torIds: Types.ObjectId[]) {
  if (!companyId || !torIds.length) return new Map<string, SelfCheckEntry[]>()
  const stored = await QualificationSelfCheck.find({ companyId, torId: { $in: torIds } })
  return new Map(stored.map((row) => [String(row.torId), row.entries as SelfCheckEntry[]]))
}

/**
 * The listing's simple filters. Each must be one string: a repeated parameter
 * arrives as an array and `status[$ne]=x` as an object, and either would
 * otherwise reach the filter code below as something other than text.
 */
const listQuerySchema = z.object({
  keyword: z.string().max(200).optional(),
  status: z.string().max(100).optional(),
  department: z.string().max(300).optional(),
  budgetRange: z.string().max(50).optional(),
})

export const listTors = asyncHandler(async (req: Request, res: Response) => {
  const parsedQuery = listQuerySchema.safeParse(req.query)
  if (!parsedQuery.success) throw ApiError.badRequest("Invalid query")
  const { keyword, status, department, budgetRange } = parsedQuery.data
  const sort = isTorSort(req.query.sort) ? req.query.sort : DEFAULT_TOR_SORT

  let detail: ReturnType<typeof detailFiltersSchema.parse> | undefined
  if (req.query.detail !== undefined) {
    try {
      detail = detailFiltersSchema.parse(JSON.parse(String(req.query.detail)))
    } catch {
      throw ApiError.badRequest("Invalid detail filters")
    }
  }
  // The department value is localizedKey(): English, or Thai for a Thai-only TOR.
  const filters: SimpleTorFilters = {
    status: status && status !== "all" ? status : undefined,
    department: department && department !== "all" ? department : undefined,
    budget: budgetRange && budgetRange !== "all" ? BUDGET_RANGES[budgetRange] : undefined,
    keyword,
  }

  // Every published TOR comes from memory (see tor-cache.service); the database
  // is read again only when that list is older than a minute or a TOR is published.
  const [published, company] = await Promise.all([
    torListCache.get(),
    req.user ? Company.findOne({ ownerId: req.user.sub }) : Promise.resolve(null),
  ])
  const tors = published.filter((tor) => matchesSimpleFilters(tor, filters))
  // One query for the whole page rather than one per TOR: the matching loop
  // below already runs in JS over every result.
  const selfChecks = await selfChecksByTor(company?._id, tors.map((tor) => tor._id))
  const now = new Date()
  const open = req.query.openOnly === "true"
  const items = sortTors(
    tors.filter((tor) => matchesDetailFilters(tor, detail) && (!open || isOpenForBids(tor, now))),
    sort
  ).map((tor) => {
    const qualification = matchCompanyToTor(company, tor, now, selfChecks.get(String(tor._id)))
    return { ...tor.toObject(), id: tor.id, source: resolveTorSource(tor), eligible: qualification.eligible, qualification, bookmarked: false }
  }).filter((tor) => req.query.eligibleOnly !== "true" || tor.eligible)

  // Opt-in: callers that send no page (workspace, filter-count previews) still
  // get the whole list. Filtering has to finish first — "eligible only" and the
  // detail filters are decided per TOR in this process — so `total` is the
  // count after every filter, and only the response is cut down.
  if (req.query.page !== undefined || req.query.pageSize !== undefined) {
    res.status(200).json(paginate(items, req.query.page, req.query.pageSize))
    return
  }
  res.status(200).json({ items, total: items.length })
})

export const getTorById = asyncHandler(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.notFound("TOR not found")
  const [tor, company] = await Promise.all([
    Tor.findById(req.params.id),
    req.user ? Company.findOne({ ownerId: req.user.sub }) : Promise.resolve(null),
  ])
  if (!tor) throw ApiError.notFound("TOR not found")
  const selfChecks = await selfChecksByTor(company?._id, [tor._id])
  const qualification = matchCompanyToTor(company, tor, new Date(), selfChecks.get(String(tor._id)))
  res.status(200).json({ ...tor.toObject(), id: tor.id, source: resolveTorSource(tor), eligible: qualification.eligible, qualification, bookmarked: false })
})

/** Returns the localized values, de-duplicated by {@link localizedKey}. */
async function distinctLocalized(field: "department" | "localOffice") {
  const values = await Tor.distinct(field)
  const byKey = new Map<string, { en: string; th: string }>()
  for (const value of values as { en: string; th: string }[]) {
    const key = localizedKey(value)
    if (key) byKey.set(key, value)
  }
  return [...byKey.values()].sort((a, b) => localizedKey(a).localeCompare(localizedKey(b), "th"))
}

export const listTorDepartments = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(await distinctLocalized("department"))
})

export const listTorLocalOffices = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(await distinctLocalized("localOffice"))
})

export const getTorQualification = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  if (!isValidObjectId(req.params.id)) throw ApiError.notFound("TOR not found")
  const [tor, company] = await Promise.all([
    Tor.findById(req.params.id),
    Company.findOne({ ownerId: req.user.sub }),
  ])
  if (!tor) throw ApiError.notFound("TOR not found")
  const selfChecks = await selfChecksByTor(company?._id, [tor._id])
  res.status(200).json(matchCompanyToTor(company, tor, new Date(), selfChecks.get(String(tor._id))))
})
