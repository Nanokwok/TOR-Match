import { Schema, model } from "mongoose"

/**
 * One row per digest email that went out (or is being sent), keyed by user,
 * kind and day. Its unique index is what keeps the digest to one email per
 * period however many ticks, restarts or server instances see it as due.
 */
const digestRunSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["daily", "weekly"], required: true },
    periodKey: { type: String, required: true },
  },
  { timestamps: true }
)

digestRunSchema.index({ userId: 1, kind: 1, periodKey: 1 }, { unique: true })

export const DigestRun = model("DigestRun", digestRunSchema)
