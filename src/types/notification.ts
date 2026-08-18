export type NotificationCategory =
  | "match"
  | "deadline"
  | "system"

export type NotificationActionLabel = "View TOR →" | "Open Workspace"

export type AppNotification = {
  id: string
  category: NotificationCategory
  title: string
  titleTh?: string
  description: string
  descriptionTh?: string
  createdAt: string
  isRead: boolean
  /** True when the TOR matches automatically verified qualification criteria. */
  autoVerifiedMatch?: boolean
  link?: string
  actionLabel?: NotificationActionLabel
  actionLabelTh?: string
}
