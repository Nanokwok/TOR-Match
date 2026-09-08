import type { Request, Response } from "express"
import { Notification } from "@/models/Notification.model"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const items = await Notification.find({ userId: req.user.sub }).sort({ createdAt: -1 })
  res.status(200).json(items)
})

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.sub },
    { $set: { isRead: true } },
    { new: true }
  )
  if (!notification) throw ApiError.notFound("Notification not found")
  res.status(200).json(notification)
})

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  await Notification.updateMany({ userId: req.user.sub, isRead: false }, { $set: { isRead: true } })
  res.status(204).send()
})
