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
  const defaults = cloneNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS)
  if (!settings) {
    return { ...defaults, emailRecipient: accountEmail || "" }
  }

  const events = { ...defaults.events }
  if (settings.events) {
    for (const [key, pref] of Object.entries(settings.events)) {
      if (pref && typeof pref === "object") {
        const id = key as keyof typeof events
        events[id] = {
          inApp: typeof pref.inApp === "boolean" ? pref.inApp : (defaults.events[id]?.inApp ?? true),
          email: typeof pref.email === "boolean" ? pref.email : (defaults.events[id]?.email ?? true),
        }
      }
    }
  }

  return {
    inAppEnabled: typeof settings.inAppEnabled === "boolean" ? settings.inAppEnabled : defaults.inAppEnabled,
    emailEnabled: typeof settings.emailEnabled === "boolean" ? settings.emailEnabled : defaults.emailEnabled,
    emailRecipient: accountEmail || "",
    events,
    instantEmailAlerts:
      typeof settings.instantEmailAlerts === "boolean"
        ? settings.instantEmailAlerts
        : defaults.instantEmailAlerts,
    dailyDigestEnabled:
      typeof settings.dailyDigestEnabled === "boolean"
        ? settings.dailyDigestEnabled
        : defaults.dailyDigestEnabled,
    dailyDigestTime: settings.dailyDigestTime ?? defaults.dailyDigestTime,
    weeklyDigestEnabled:
      typeof settings.weeklyDigestEnabled === "boolean"
        ? settings.weeklyDigestEnabled
        : defaults.weeklyDigestEnabled,
    weeklyDigestDay: settings.weeklyDigestDay ?? defaults.weeklyDigestDay,
    weeklyDigestTime: settings.weeklyDigestTime ?? defaults.weeklyDigestTime,
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
