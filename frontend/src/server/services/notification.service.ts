import "server-only"

import { cookies } from "next/headers"
import { apiFetch } from "@/lib/api-client"
import { required } from "@/lib/env"
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
  if (!headers.Authorization) return []
  const items = await apiFetch<BackendNotification[]>("/notifications", { headers })
  return items.map(fromBackend)
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
    headers: await authHeaders(),
  })
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch("/notifications/read-all", {
    method: "PATCH",
    headers: await authHeaders(),
  })
}

export async function deleteNotification(id: string): Promise<void> {
  await apiFetch(`/notifications/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  })
}
