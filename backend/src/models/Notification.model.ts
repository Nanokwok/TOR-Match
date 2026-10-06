import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"
import { localizedTextSchema } from "@/models/localized.schema"

/** Mirrors src/types/notification.ts (AppNotification) on the frontend. */
const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, enum: ["match", "high-budget", "deal-breaker", "deadline", "system"], required: true },
    title: { type: localizedTextSchema, required: true },
    description: { type: localizedTextSchema, required: true },
    isRead: { type: Boolean, default: false },
    autoVerifiedMatch: { type: Boolean, default: false },
    /** Set for category "match" notifications; identifies which TOR this alert is about, for dedup. */
    torId: { type: Schema.Types.ObjectId, ref: "Tor", index: true },
    /** False when the user wanted this event by email only; the bell hides it. */
    inApp: { type: Boolean, default: true },
    /** Set once the email for this notification was handed to the mail server. */
    emailedAt: { type: Date },
    /** One alert per (user, TOR, event version): what keeps a scraper re-run from notifying twice. */
    dedupeKey: { type: String, index: true },
    link: { type: String },
    /** UI label key; the wording lives in the frontend i18n dictionary. */
    action: { type: String, enum: ["view-tor", "open-workspace"] },
  },
  { timestamps: true }
)

export type NotificationDoc = HydratedDocument<InferSchemaType<typeof notificationSchema>>

export const Notification = model("Notification", notificationSchema)
