import type {
  NotificationEventDefinition,
  NotificationSettings,
} from "@/types/notification-settings"

export const NOTIFICATION_EVENTS: NotificationEventDefinition[] = [
  {
    id: "new-high-match",
    label: "New TOR matching automatically verified qualifications",
  },
  {
    id: "high-budget",
    label: "High Budget Opportunity (> ฿10M)",
  },
  {
    id: "deal-breaker",
    label: "Deal-Breaker Alert",
    description: "Saved TOR criteria changed",
  },
  {
    id: "deadline-7-day",
    label: "7-Day Deadline Reminder",
  },
  {
    id: "deadline-3-day",
    label: "3-Day Urgent Deadline Warning",
  },
  {
    id: "deadline-24-hour",
    label: "24-Hour Final Call",
  },
  {
    id: "system-profile",
    label: "System & Profile Verification",
  },
]

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
