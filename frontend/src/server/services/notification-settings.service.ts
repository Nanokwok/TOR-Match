import "server-only"

import { cookies } from "next/headers"
import { apiFetch } from "@/lib/api-client"
import { required } from "@/lib/env"
import {
  cloneNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from "@/lib/notification-settings"
import type { NotificationSettings } from "@/types/notification-settings"

async function authHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get(required("AUTH_COOKIE_NAME"))?.value
  return token ? { Authorization: `Bearer ${token}` } : {}
}

type BackendNotificationSettings = NotificationSettings & {
  _id: string
  userId: string
  createdAt: string
  updatedAt: string
}

type SettingsResponse = {
  settings: BackendNotificationSettings | null
  accountEmail: string
}

/** The recipient is not a setting: alerts go to the address the user signs in with. */
function fromBackend({ settings, accountEmail }: SettingsResponse): NotificationSettings {
  if (!settings) {
    return { ...cloneNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS), emailRecipient: accountEmail }
  }
  return {
    inAppEnabled: settings.inAppEnabled,
    emailEnabled: settings.emailEnabled,
    emailRecipient: accountEmail,
    events: settings.events,
    instantEmailAlerts: settings.instantEmailAlerts,
    dailyDigestEnabled: settings.dailyDigestEnabled,
    dailyDigestTime: settings.dailyDigestTime,
    weeklyDigestEnabled: settings.weeklyDigestEnabled,
    weeklyDigestDay: settings.weeklyDigestDay,
    weeklyDigestTime: settings.weeklyDigestTime,
  }
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const headers = await authHeaders()
  if (!headers.Authorization) return cloneNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS)
  return fromBackend(await apiFetch<SettingsResponse>("/notification-settings", { headers }))
}

export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<NotificationSettings> {
  const saved = await apiFetch<SettingsResponse>("/notification-settings", {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(settings),
  })
  return fromBackend(saved)
}
