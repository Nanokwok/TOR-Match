import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"

/** Mirrors src/types/workspace.ts (WorkspaceCard) on the frontend, scoped per owning user. */
const checklistItemSchema = new Schema(
  {
    label: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: true }
)

const workspaceCardSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    torId: { type: Schema.Types.ObjectId, ref: "Tor", required: true },
    column: {
      type: String,
      enum: ["bookmark", "todo", "in-progress", "done"],
      default: "bookmark",
      index: true,
    },
    priority: { type: String, enum: ["HIGH", "MEDIUM", "LOW"], default: "MEDIUM" },
    assigneeIds: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    checklist: { type: [checklistItemSchema], default: [] },
  },
  { timestamps: true }
)

workspaceCardSchema.index({ ownerId: 1, torId: 1 }, { unique: true })

export type WorkspaceCardDoc = HydratedDocument<InferSchemaType<typeof workspaceCardSchema>>

export const WorkspaceCard = model("WorkspaceCard", workspaceCardSchema)
