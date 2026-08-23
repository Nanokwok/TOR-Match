"use server"

import {
  cloneNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from "@/lib/notification-settings"
import type { NotificationSettings } from "@/types/notification-settings"

let savedSettings = cloneNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS)

export async function getNotificationSettingsAction() {
  return cloneNotificationSettings(savedSettings)
}

export async function saveNotificationSettingsAction(
  settings: NotificationSettings
) {
  savedSettings = cloneNotificationSettings(settings)
  return { ok: true as const, settings: cloneNotificationSettings(savedSettings) }
}
