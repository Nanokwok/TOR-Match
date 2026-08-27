import type { LocalizedText } from "@/types/localized"

export type NotificationCategory =
  | "match"
  | "deadline"
  | "system"

/**
 * The call-to-action rendered on a notification. This is a UI label, not data —
 * the wording lives in the i18n dictionary under `notifications.action.*`.
 */
export type NotificationAction = "view-tor" | "open-workspace"

export type AppNotification = {
  id: string
  category: NotificationCategory
  title: LocalizedText
  description: LocalizedText
  createdAt: string
  isRead: boolean
  /** True when the TOR matches automatically verified qualification criteria. */
  autoVerifiedMatch?: boolean
  link?: string
  action?: NotificationAction
}
