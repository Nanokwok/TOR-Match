import type { Request, Response } from "express"
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

  const filter: Record<string, unknown> = {}
  if (status && status !== "all") filter.status = status
  // English is the canonical identity for localized values.
  if (department && department !== "all") filter["department.en"] = department
  if (budgetRange && budgetRange !== "all" && BUDGET_RANGES[budgetRange]) {
    const { min, max } = BUDGET_RANGES[budgetRange]
    filter.budgetBaht = { $gte: min, $lt: max }
  }
  if (keyword?.trim()) {
    const q = keyword.trim()
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

  const items = await Tor.find(filter).sort({ createdAt: -1 })
  res.status(200).json({ items, total: items.length })
})

export const getTorById = asyncHandler(async (req: Request, res: Response) => {
  const tor = await Tor.findById(req.params.id)
  if (!tor) throw ApiError.notFound("TOR not found")
  res.status(200).json(tor)
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
