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

function fromBackend(settings: BackendNotificationSettings): NotificationSettings {
  const { _id, userId, createdAt, updatedAt, ...rest } = settings
  return rest
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const headers = await authHeaders()
  if (!headers.Authorization) return cloneNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS)
  const settings = await apiFetch<BackendNotificationSettings | null>("/notification-settings", { headers })
  return settings ? fromBackend(settings) : cloneNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS)
}

export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<NotificationSettings> {
  const saved = await apiFetch<BackendNotificationSettings>("/notification-settings", {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(settings),
  })
  return fromBackend(saved)
}
