export type NotificationChannel = "inApp" | "email"

export type NotificationEventId =
  | "new-high-match"
  | "high-budget"
  | "deal-breaker"
  | "deadline-7-day"
  | "deadline-3-day"
  | "deadline-24-hour"
  | "team-assignment"
  | "team-comments"
  | "system-profile"

export type NotificationEventPreference = {
  inApp: boolean
  email: boolean
}

export type DigestDeliveryTime =
  | "06:00"
  | "08:00"
  | "09:00"
  | "12:00"
  | "17:00"
  | "20:00"

export type WeeklyDigestDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"

export type NotificationSettings = {
  inAppEnabled: boolean
  emailEnabled: boolean
  emailRecipient: string
  events: Record<NotificationEventId, NotificationEventPreference>
  instantEmailAlerts: boolean
  dailyDigestEnabled: boolean
  dailyDigestTime: DigestDeliveryTime
  weeklyDigestEnabled: boolean
  weeklyDigestDay: WeeklyDigestDay
  weeklyDigestTime: DigestDeliveryTime
}

export type NotificationEventDefinition = {
  id: NotificationEventId
  label: string
  description?: string
}
