import type { Request, Response } from "express"
import { z } from "zod"

import {
  DEFAULT_ADMIN_SYSTEM_SETTINGS,
  SYSTEM_SETTINGS_SINGLETON_KEY,
  SystemSettings,
  type SystemSettingsDoc,
} from "@/models/SystemSettings.model"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

const updateSettingsSchema = z.object({
  scraperEnabled: z.boolean().optional(),
  scraperIntervalMinutes: z.number().int().min(5).optional(),
  ocrWorkers: z.number().int().min(1).max(16).optional(),
  autoApproveEnabled: z.boolean().optional(),
  autoApproveThreshold: z.number().min(50).max(100).optional(),
  notifyOnOcrFailure: z.boolean().optional(),
  notifyOnNewSignup: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  adminSessionMinutes: z.number().int().min(5).max(120).optional(),
  supportEmail: z.string().email().trim().toLowerCase().optional(),
})

export type AdminSystemSettingsResponse = {
  scraperEnabled: boolean
  scraperIntervalMinutes: number
  ocrWorkers: number
  autoApproveEnabled: boolean
  autoApproveThreshold: number
  notifyOnOcrFailure: boolean
  notifyOnNewSignup: boolean
  maintenanceMode: boolean
  adminSessionMinutes: number
  supportEmail: string
}

function toAdminSystemSettings(doc: SystemSettingsDoc): AdminSystemSettingsResponse {
  return {
    scraperEnabled: doc.scraperEnabled,
    scraperIntervalMinutes: doc.scraperIntervalMinutes,
    ocrWorkers: doc.ocrWorkers,
    autoApproveEnabled: doc.autoApproveEnabled,
    autoApproveThreshold: doc.autoApproveThreshold,
    notifyOnOcrFailure: doc.notifyOnOcrFailure,
    notifyOnNewSignup: doc.notifyOnNewSignup,
    maintenanceMode: doc.maintenanceMode,
    adminSessionMinutes: doc.adminSessionMinutes,
    supportEmail: doc.supportEmail,
  }
}

export const getAdminSettings = asyncHandler(async (_req: Request, res: Response) => {
  const doc = await SystemSettings.findOneAndUpdate(
    { singletonKey: SYSTEM_SETTINGS_SINGLETON_KEY },
    {
      $setOnInsert: {
        singletonKey: SYSTEM_SETTINGS_SINGLETON_KEY,
        ...DEFAULT_ADMIN_SYSTEM_SETTINGS,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  res.status(200).json(toAdminSystemSettings(doc))
})

export const updateAdminSettings = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSettingsSchema.safeParse(req.body)
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid system settings", parsed.error.flatten())
  }

  const doc = await SystemSettings.findOneAndUpdate(
    { singletonKey: SYSTEM_SETTINGS_SINGLETON_KEY },
    { $set: parsed.data },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )

  res.status(200).json(toAdminSystemSettings(doc))
})

export const resetAdminSettings = asyncHandler(async (_req: Request, res: Response) => {
  const doc = await SystemSettings.findOneAndUpdate(
    { singletonKey: SYSTEM_SETTINGS_SINGLETON_KEY },
    { $set: DEFAULT_ADMIN_SYSTEM_SETTINGS },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )

  res.status(200).json(toAdminSystemSettings(doc))
})
