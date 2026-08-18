import type {
  NotificationEventId,
  NotificationSettings,
} from "@/types/notification-settings"

export const NOTIFICATION_EVENT_IDS: NotificationEventId[] = [
  "new-high-match",
  "high-budget",
  "deal-breaker",
  "deadline-7-day",
  "deadline-3-day",
  "deadline-24-hour",
  "system-profile",
]

export const NOTIFICATION_EVENTS_WITH_DESCRIPTION = new Set<NotificationEventId>([
  "deal-breaker",
])

export const DAILY_DIGEST_TIMES = [
  { value: "06:00", label: "06:00 AM" },
  { value: "08:00", label: "08:00 AM" },
  { value: "09:00", label: "09:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "17:00", label: "05:00 PM" },
  { value: "20:00", label: "08:00 PM" },
] as const

export const WEEKLY_DIGEST_DAYS = [
  { value: "monday", label: "Every Monday" },
  { value: "tuesday", label: "Every Tuesday" },
  { value: "wednesday", label: "Every Wednesday" },
  { value: "thursday", label: "Every Thursday" },
  { value: "friday", label: "Every Friday" },
] as const

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  inAppEnabled: true,
  emailEnabled: true,
  emailRecipient: "user@company.com",
  events: {
    "new-high-match": { inApp: true, email: true },
    "high-budget": { inApp: true, email: true },
    "deal-breaker": { inApp: true, email: true },
    "deadline-7-day": { inApp: true, email: false },
    "deadline-3-day": { inApp: true, email: true },
    "deadline-24-hour": { inApp: true, email: true },
    "team-assignment": { inApp: true, email: true },
    "team-comments": { inApp: true, email: false },
    "system-profile": { inApp: true, email: true },
  },
  instantEmailAlerts: true,
  dailyDigestEnabled: true,
  dailyDigestTime: "08:00",
  weeklyDigestEnabled: true,
  weeklyDigestDay: "monday",
  weeklyDigestTime: "09:00",
}

export function cloneNotificationSettings(
  settings: NotificationSettings
): NotificationSettings {
  return {
    ...settings,
    events: Object.fromEntries(
      Object.entries(settings.events).map(([id, value]) => [
        id,
        { ...value },
      ])
    ) as NotificationSettings["events"],
  }
}
