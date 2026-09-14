import type { Request, Response } from "express"
import { NotificationSettings } from "@/models/NotificationSettings.model"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

export const getMyNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const settings = await NotificationSettings.findOne({ userId: req.user.sub })
  res.status(200).json(settings)
})

export const upsertMyNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const settings = await NotificationSettings.findOneAndUpdate(
    { userId: req.user.sub },
    { $set: { ...req.body, userId: req.user.sub } },
    { new: true, upsert: true, runValidators: true }
  )
  res.status(200).json(settings)
})
