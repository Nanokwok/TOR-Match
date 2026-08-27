import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"
import { localizedTextSchema } from "@/models/localized.schema"

/** Mirrors src/types/notification.ts (AppNotification) on the frontend. */
const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, enum: ["match", "deadline", "system"], required: true },
    title: { type: localizedTextSchema, required: true },
    description: { type: localizedTextSchema, required: true },
    isRead: { type: Boolean, default: false },
    autoVerifiedMatch: { type: Boolean, default: false },
    link: { type: String },
    /** UI label key; the wording lives in the frontend i18n dictionary. */
    action: { type: String, enum: ["view-tor", "open-workspace"] },
  },
  { timestamps: true }
)

export type NotificationDoc = HydratedDocument<InferSchemaType<typeof notificationSchema>>

export const Notification = model("Notification", notificationSchema)
