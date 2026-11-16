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

/**
 * The bell sits in every page's header, so a notifications failure must not
 * take the page down: it is logged and the bell shows nothing. Signed-out
 * visitors have no notifications, so nothing is requested for them.
 */
export async function listNotifications(): Promise<AppNotification[]> {
  const headers = await authHeaders()
  if (!headers.Authorization) return []
  try {
    const items = await apiFetch<BackendNotification[]>("/notifications", { headers })
    return items.map(fromBackend)
  } catch (error) {
    console.error("listNotifications failed", error)
    return []
  }
}

/** The bell updates optimistically, so a failed write is logged rather than thrown. */
async function send(path: string, method: "PATCH" | "DELETE"): Promise<void> {
  const headers = await authHeaders()
  if (!headers.Authorization) return
  try {
    await apiFetch(path, { method, headers })
  } catch (error) {
    console.error(`${method} ${path} failed`, error)
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await send(`/notifications/${encodeURIComponent(id)}/read`, "PATCH")
}

export async function markAllNotificationsRead(): Promise<void> {
  await send("/notifications/read-all", "PATCH")
}

export async function deleteNotification(id: string): Promise<void> {
  await send(`/notifications/${encodeURIComponent(id)}`, "DELETE")
}
