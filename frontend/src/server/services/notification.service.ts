import "server-only"

import { cookies } from "next/headers"
import { apiFetch } from "@/lib/api-client"
import { required } from "@/lib/env"
import {
  deleteMockNotification,
  getMockNotifications,
  markAllMockNotificationsRead,
  markMockNotificationRead,
} from "@/server/db/mock/notifications"
import type { AppNotification } from "@/types/notification"

async function authHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get(required("AUTH_COOKIE_NAME"))?.value
  return token ? { Authorization: `Bearer ${token}` } : {}
}

type BackendNotification = Omit<AppNotification, "id"> & { _id: string }

function fromBackend(notification: BackendNotification): AppNotification {
  const { _id, ...rest } = notification
  return { id: _id, ...rest }
}

export async function listNotifications(): Promise<AppNotification[]> {
  const headers = await authHeaders()
  if (!headers.Authorization) return getMockNotifications()
  try {
    const items = await apiFetch<BackendNotification[]>("/notifications", { headers })
    return items.length > 0 ? items.map(fromBackend) : getMockNotifications()
  } catch {
    return getMockNotifications()
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const headers = await authHeaders()
  if (!headers.Authorization) {
    markMockNotificationRead(id)
    return
  }
  try {
    await apiFetch(`/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
      headers,
    })
  } catch {
    markMockNotificationRead(id)
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const headers = await authHeaders()
  if (!headers.Authorization) {
    markAllMockNotificationsRead()
    return
  }
  try {
    await apiFetch("/notifications/read-all", {
      method: "PATCH",
      headers,
    })
  } catch {
    markAllMockNotificationsRead()
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const headers = await authHeaders()
  if (!headers.Authorization) {
    deleteMockNotification(id)
    return
  }
  try {
    await apiFetch(`/notifications/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    })
  } catch {
    deleteMockNotification(id)
  }
}
