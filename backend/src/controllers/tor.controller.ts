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
  if (department && department !== "all") filter.department = department
  if (budgetRange && budgetRange !== "all" && BUDGET_RANGES[budgetRange]) {
    const { min, max } = BUDGET_RANGES[budgetRange]
    filter.budgetBaht = { $gte: min, $lt: max }
  }
  if (keyword?.trim()) {
    const q = keyword.trim()
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { department: { $regex: q, $options: "i" } },
      { localOffice: { $regex: q, $options: "i" } },
      { announcementNo: { $regex: q, $options: "i" } },
      { techTags: { $regex: q, $options: "i" } },
      { summary: { $regex: q, $options: "i" } },
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

export const listTorDepartments = asyncHandler(async (_req: Request, res: Response) => {
  const departments = await Tor.distinct("department")
  res.status(200).json(departments.sort())
})

export const listTorLocalOffices = asyncHandler(async (_req: Request, res: Response) => {
  const offices = await Tor.distinct("localOffice")
  res.status(200).json(offices.sort())
})
