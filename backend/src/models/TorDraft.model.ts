import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"
import { torContentFields } from "@/models/tor-fields.schema"

/**
 * A scraped TOR awaiting human review.
 *
 * Drafts are deliberately a separate collection from {@link Tor} rather than a
 * flag on it. Two reasons: an unreviewed draft can never leak into /browse by
 * way of a query that forgot to filter, and re-running the scraper over an
 * announcement that was already published and hand-corrected rewrites the
 * draft only — the published TOR keeps the human's edits.
 */

export const REVIEW_STATUSES = ["need-review", "auto-approved", "approved"] as const

/** Mirrors AUTO_APPROVE_CONFIDENCE_THRESHOLD in the admin review UI. */
export const AUTO_APPROVE_CONFIDENCE_THRESHOLD = 90

const torDraftSchema = new Schema(
  {
    ...torContentFields,

    reviewStatus: {
      type: String,
      enum: REVIEW_STATUSES,
      default: "need-review",
      index: true,
    },
    /** The extraction model's self-reported confidence, 0-100. A triage signal for reviewers, not a correctness guarantee. */
    aiConfidence: { type: Number, min: 0, max: 100, default: 0 },
    /** Announcement page this was scraped from. */
    pdfUrl: { type: String, default: "" },
    sourceJobId: { type: Schema.Types.ObjectId, ref: "ScrapeJob", default: null },
    /** Set once published; a draft with this set has a counterpart in `tors`. */
    publishedTorId: { type: Schema.Types.ObjectId, ref: "Tor", default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export type TorDraftDoc = HydratedDocument<InferSchemaType<typeof torDraftSchema>>

export const TorDraft = model("TorDraft", torDraftSchema)
