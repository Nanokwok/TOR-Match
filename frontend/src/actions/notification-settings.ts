"use server"

import { revalidatePath } from "next/cache"
import { ApiRequestError } from "@/lib/api-client"
import {
  cloneNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from "@/lib/notification-settings"
import {
  getNotificationSettings,
  saveNotificationSettings,
} from "@/server/services/notification-settings.service"
import type { NotificationSettings } from "@/types/notification-settings"

function isDynamicServerError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("DYNAMIC_SERVER_USAGE")
  )
}

export async function getNotificationSettingsAction(): Promise<NotificationSettings> {
  try {
    return await getNotificationSettings()
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("getNotificationSettingsAction failed, falling back to defaults", error)
    return cloneNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS)
  }
}

export async function saveNotificationSettingsAction(
  settings: NotificationSettings
): Promise<
  { ok: true; settings: NotificationSettings } | { ok: false; error: string }
> {
  try {
    const saved = await saveNotificationSettings(settings)
    revalidatePath("/settings/notifications")
    return { ok: true, settings: saved }
  } catch (error) {
    const message =
      error instanceof ApiRequestError ? error.message : "Something went wrong. Please try again."
    console.error("saveNotificationSettingsAction failed", error)
    return { ok: false, error: message }
  }
}
