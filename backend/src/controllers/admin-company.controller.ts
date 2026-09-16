import type { Request, Response } from "express"
import { Types, type FilterQuery } from "mongoose"
import { z } from "zod"

import {
  isObjectIdString,
  toAdminCompanyDetail,
  toAdminCompanyListItem,
  type AdminCompanyStats,
} from "@/dto/admin-company.dto"
import {
  COMPANY_SIZES,
  COMPANY_STATUSES,
  Company,
  type CompanyDoc,
  type CompanyStatus,
} from "@/models/Company.model"
import { User } from "@/models/User.model"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

const ALLOWED_STATUS_TRANSITIONS: Record<CompanyStatus, CompanyStatus[]> = {
  pending: ["active"],
  active: ["suspended"],
  suspended: ["active"],
}

const listQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(COMPANY_STATUSES).optional(),
  size: z.enum(COMPANY_SIZES).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

const statusBodySchema = z.object({
  status: z.enum(COMPANY_STATUSES),
})

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function resolveStatus(company: CompanyDoc): CompanyStatus {
  const value = company.status as CompanyStatus | undefined
  return value && COMPANY_STATUSES.includes(value) ? value : "active"
}

async function memberCountsByCompanyId(
  companyIds: Types.ObjectId[]
): Promise<Map<string, number>> {
  if (companyIds.length === 0) return new Map()

  const rows = await User.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { companyId: { $in: companyIds } } },
    { $group: { _id: "$companyId", count: { $sum: 1 } } },
  ])

  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(String(row._id), row.count)
  }
  return map
}

function memberCountFor(
  company: CompanyDoc,
  counts: Map<string, number>
): number {
  const linked = counts.get(String(company._id)) ?? 0
  if (linked > 0) return linked
  return company.ownerId ? 1 : 0
}

export const listAdminCompanies = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid query", parsed.error.flatten())
  }

  const { q, status, size, page, limit } = parsed.data
  const clauses: FilterQuery<CompanyDoc>[] = []

  if (status === "active") {
    clauses.push({
      $or: [{ status: "active" }, { status: { $exists: false } }, { status: null }],
    })
  } else if (status) {
    clauses.push({ status })
  }

  if (size) clauses.push({ companySize: size })

  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i")
    clauses.push({
      $or: [
        { companyNameThai: pattern },
        { companyNameEnglish: pattern },
        { taxId: pattern },
        { contactEmail: pattern },
      ],
    })
  }

  const filter: FilterQuery<CompanyDoc> =
    clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0]! : { $and: clauses }

  const [total, companies] = await Promise.all([
    Company.countDocuments(filter),
    Company.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ])

  const counts = await memberCountsByCompanyId(companies.map((c) => c._id))
  const items = companies.map((company) =>
    toAdminCompanyListItem(company, memberCountFor(company, counts))
  )

  res.status(200).json({ items, page, limit, total })
})

export const getAdminCompanyStats = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await Company.aggregate<{ _id: CompanyStatus | null; count: number }>([
    {
      $group: {
        _id: { $ifNull: ["$status", "active"] },
        count: { $sum: 1 },
      },
    },
  ])

  const stats: AdminCompanyStats = {
    total: 0,
    active: 0,
    pending: 0,
    suspended: 0,
  }

  for (const row of rows) {
    const key = row._id && COMPANY_STATUSES.includes(row._id) ? row._id : "active"
    stats[key] += row.count
    stats.total += row.count
  }

  res.status(200).json(stats)
})

export const getAdminCompanyById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  if (!id || !isObjectIdString(id)) throw ApiError.notFound("Company not found")

  const company = await Company.findById(id)
  if (!company) throw ApiError.notFound("Company not found")

  const counts = await memberCountsByCompanyId([company._id])
  res.status(200).json(toAdminCompanyDetail(company, memberCountFor(company, counts)))
})

export const patchAdminCompanyStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  if (!id || !isObjectIdString(id)) throw ApiError.notFound("Company not found")

  const parsed = statusBodySchema.safeParse(req.body)
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid status", parsed.error.flatten())
  }

  const company = await Company.findById(id)
  if (!company) throw ApiError.notFound("Company not found")

  const current = resolveStatus(company)
  const next = parsed.data.status

  if (current === next) {
    const counts = await memberCountsByCompanyId([company._id])
    res.status(200).json(toAdminCompanyDetail(company, memberCountFor(company, counts)))
    return
  }

  if (!ALLOWED_STATUS_TRANSITIONS[current].includes(next)) {
    throw ApiError.badRequest(`Cannot change status from ${current} to ${next}`)
  }

  company.status = next
  await company.save()

  const counts = await memberCountsByCompanyId([company._id])
  res.status(200).json(toAdminCompanyDetail(company, memberCountFor(company, counts)))
})
