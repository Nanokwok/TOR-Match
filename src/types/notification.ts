export type NotificationCategory =
  | "match"
  | "deadline"
  | "system"

export type NotificationActionLabel = "View TOR →" | "Open Workspace"

export type AppNotification = {
  id: string
  category: NotificationCategory
  title: string
  description: string
  createdAt: string
  isRead: boolean
  matchScore?: number
  link?: string
  actionLabel?: NotificationActionLabel
}
