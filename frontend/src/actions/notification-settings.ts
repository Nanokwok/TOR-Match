"use server"

import { ApiRequestError } from "@/lib/api-client"
import {
  getNotificationSettings,
  saveNotificationSettings,
} from "@/server/services/notification-settings.service"
import type { NotificationSettings } from "@/types/notification-settings"

export async function getNotificationSettingsAction() {
  return getNotificationSettings()
}

export async function saveNotificationSettingsAction(
  settings: NotificationSettings
): Promise<
  { ok: true; settings: NotificationSettings } | { ok: false; error: string }
> {
  try {
    const saved = await saveNotificationSettings(settings)
    return { ok: true, settings: saved }
  } catch (error) {
    const message =
      error instanceof ApiRequestError ? error.message : "Something went wrong. Please try again."
    console.error("saveNotificationSettingsAction failed", error)
    return { ok: false, error: message }
  }
}
