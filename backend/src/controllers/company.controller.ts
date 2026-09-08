import type { Request, Response } from "express"
import { Company } from "@/models/Company.model"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

export const getMyCompany = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const company = await Company.findOne({ ownerId: req.user.sub })
  res.status(200).json(company)
})

export const upsertMyCompany = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const company = await Company.findOneAndUpdate(
    { ownerId: req.user.sub },
    { $set: { ...req.body, ownerId: req.user.sub } },
    { new: true, upsert: true, runValidators: true }
  )
  res.status(200).json(company)
})
