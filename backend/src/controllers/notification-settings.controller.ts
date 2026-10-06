import type { Request, Response } from "express"
import { NotificationSettings } from "@/models/NotificationSettings.model"
import { User } from "@/models/User.model"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

/**
 * Alert emails always go to the address the user signs in with, resolved at
 * send time, so the settings screen only needs to show it. `accountEmail`
 * rides along on every response for exactly that.
 */
async function accountEmailOf(userId: string): Promise<string> {
  const user = await User.findById(userId).select("email").lean()
  return user?.email ?? ""
}

export const getMyNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const [settings, accountEmail] = await Promise.all([
    NotificationSettings.findOne({ userId: req.user.sub }),
    accountEmailOf(req.user.sub),
  ])
  res.status(200).json({ settings, accountEmail })
})

export const upsertMyNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const [settings, accountEmail] = await Promise.all([
    NotificationSettings.findOneAndUpdate(
      { userId: req.user.sub },
      // The recipient is never stored: it follows the account's email.
      { $set: { ...req.body, emailRecipient: "", userId: req.user.sub } },
      { new: true, upsert: true, runValidators: true }
    ),
    accountEmailOf(req.user.sub),
  ])
  res.status(200).json({ settings, accountEmail })
})
