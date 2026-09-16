"use server"

import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/services/notification.service"

export async function getNotificationsAction() {
  return listNotifications()
}

export async function markNotificationReadAction(id: string) {
  await markNotificationRead(id)
}

export async function markAllNotificationsReadAction() {
  await markAllNotificationsRead()
}

export async function deleteNotificationAction(id: string) {
  await deleteNotification(id)
}
