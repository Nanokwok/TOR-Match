import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"

/** Mirrors src/types/notification-settings.ts (NotificationSettings) on the frontend. */
const NOTIFICATION_EVENT_IDS = [
  "new-high-match",
  "high-budget",
  "deal-breaker",
  "deadline-7-day",
  "deadline-3-day",
  "deadline-24-hour",
  "team-assignment",
  "team-comments",
  "system-profile",
] as const

const DIGEST_TIMES = ["06:00", "08:00", "09:00", "12:00", "17:00", "20:00"] as const
const WEEKLY_DIGEST_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const

const eventPreferenceSchema = new Schema(
  {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
  },
  { _id: false }
)

const eventsSchema = new Schema(
  Object.fromEntries(
    NOTIFICATION_EVENT_IDS.map((id) => [id, { type: eventPreferenceSchema, default: () => ({}) }])
  ),
  { _id: false }
)

const notificationSettingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    inAppEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    emailRecipient: { type: String, default: "" },
    events: { type: eventsSchema, default: () => ({}) },
    instantEmailAlerts: { type: Boolean, default: true },
    dailyDigestEnabled: { type: Boolean, default: true },
    dailyDigestTime: { type: String, enum: DIGEST_TIMES, default: "08:00" },
    weeklyDigestEnabled: { type: Boolean, default: true },
    weeklyDigestDay: { type: String, enum: WEEKLY_DIGEST_DAYS, default: "monday" },
    weeklyDigestTime: { type: String, enum: DIGEST_TIMES, default: "09:00" },
  },
  { timestamps: true }
)

export type NotificationSettingsDoc = HydratedDocument<InferSchemaType<typeof notificationSettingsSchema>>

export const NotificationSettings = model("NotificationSettings", notificationSettingsSchema)
