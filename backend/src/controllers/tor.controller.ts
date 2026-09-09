import type { Request, Response } from "express"
import { isValidObjectId } from "mongoose"
import { Company } from "@/models/Company.model"
import { matchCompanyToTor } from "@/services/qualification.service"
import { detailFiltersSchema, matchesDetailFilters } from "@/services/tor-filters"
import { Tor } from "@/models/Tor.model"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

const BUDGET_RANGES: Record<string, { min: number; max: number }> = {
  "under-3m": { min: 0, max: 3_000_000 },
  "3m-6m": { min: 3_000_000, max: 6_000_000 },
  "6m-10m": { min: 6_000_000, max: 10_000_000 },
  "over-10m": { min: 10_000_000, max: Number.POSITIVE_INFINITY },
}

export const listTors = asyncHandler(async (req: Request, res: Response) => {
  const { keyword, status, department, budgetRange } = req.query as Record<string, string | undefined>

  let detail: ReturnType<typeof detailFiltersSchema.parse> | undefined
  if (req.query.detail !== undefined) {
    try {
      detail = detailFiltersSchema.parse(JSON.parse(String(req.query.detail)))
    } catch {
      throw ApiError.badRequest("Invalid detail filters")
    }
  }
  const filter: Record<string, unknown> = {}
  if (status && status !== "all") filter.status = status
  // English is the canonical identity for localized values.
  if (department && department !== "all") filter["department.en"] = department
  if (budgetRange && budgetRange !== "all" && BUDGET_RANGES[budgetRange]) {
    const { min, max } = BUDGET_RANGES[budgetRange]
    filter.budgetBaht = { $gte: min, $lt: max }
  }
  if (keyword?.trim()) {
    const q = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    // Search every locale so a Thai term still finds a TOR read in English.
    const localizedFields = ["title", "department", "localOffice", "summary"]
    filter.$or = [
      ...localizedFields.flatMap((field) => [
        { [`${field}.en`]: { $regex: q, $options: "i" } },
        { [`${field}.th`]: { $regex: q, $options: "i" } },
      ]),
      { announcementNo: { $regex: q, $options: "i" } },
      { techTags: { $regex: q, $options: "i" } },
    ]
  }

  const [tors, company] = await Promise.all([
    Tor.find(filter).sort({ createdAt: -1 }),
    req.user ? Company.findOne({ ownerId: req.user.sub }) : Promise.resolve(null),
  ])
  const now = new Date()
  const items = tors.filter((tor) => matchesDetailFilters(tor, detail)).map((tor) => {
    const qualification = matchCompanyToTor(company, tor, now)
    return { ...tor.toObject(), id: tor.id, eligible: qualification.eligible, qualification, bookmarked: false }
  }).filter((tor) => req.query.eligibleOnly !== "true" || tor.eligible)
  res.status(200).json({ items, total: items.length })
})

export const getTorById = asyncHandler(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.notFound("TOR not found")
  const [tor, company] = await Promise.all([
    Tor.findById(req.params.id),
    req.user ? Company.findOne({ ownerId: req.user.sub }) : Promise.resolve(null),
  ])
  if (!tor) throw ApiError.notFound("TOR not found")
  const qualification = matchCompanyToTor(company, tor)
  res.status(200).json({ ...tor.toObject(), id: tor.id, eligible: qualification.eligible, qualification, bookmarked: false })
})

/** Returns the localized values, de-duplicated by their canonical English name. */
async function distinctLocalized(field: "department" | "localOffice") {
  const values = await Tor.distinct(field)
  const byKey = new Map<string, { en: string; th: string }>()
  for (const value of values as { en: string; th: string }[]) {
    if (value?.en) byKey.set(value.en, value)
  }
  return [...byKey.values()].sort((a, b) => a.en.localeCompare(b.en))
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
  res.status(200).json(matchCompanyToTor(company, tor))
})
