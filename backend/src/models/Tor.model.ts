import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"
import { torContentFields } from "@/models/tor-fields.schema"

/**
 * A published TOR — visible to every user through /api/tors.
 *
 * Nothing writes here except the seed script and an explicit admin publish
 * (see TorDraft): scraped announcements land in `tordrafts` and only reach
 * this collection once a human approves them.
 */
const torSchema = new Schema(torContentFields, { timestamps: true })

/** English is the canonical identity used for filtering and cross-referencing. */
torSchema.index({ "department.en": 1 })

export type TorDoc = HydratedDocument<InferSchemaType<typeof torSchema>>

export const Tor = model("Tor", torSchema)
