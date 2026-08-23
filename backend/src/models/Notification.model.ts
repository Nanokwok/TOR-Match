import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"

/** Mirrors src/types/notification.ts (AppNotification) on the frontend. */
const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, enum: ["match", "deadline", "system"], required: true },
    title: { type: String, required: true },
    titleTh: { type: String },
    description: { type: String, required: true },
    descriptionTh: { type: String },
    isRead: { type: Boolean, default: false },
    autoVerifiedMatch: { type: Boolean, default: false },
    link: { type: String },
    actionLabel: { type: String },
    actionLabelTh: { type: String },
  },
  { timestamps: true }
)

export type NotificationDoc = HydratedDocument<InferSchemaType<typeof notificationSchema>>

export const Notification = model("Notification", notificationSchema)
