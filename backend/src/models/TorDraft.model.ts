import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"
import { torContentFields } from "@/models/tor-fields.schema"
import { notifyCompaniesForTor } from "@/services/match-notification.service"
import { missingRequiredEnglishField, publishDraftContent } from "@/services/tor-publish.service"

/**
 * An ingested TOR awaiting human review.
 *
 * Drafts are deliberately a separate collection from {@link Tor} rather than a
 * flag on it. Two reasons: an unreviewed draft can never leak into /browse by
 * way of a query that forgot to filter, and re-ingesting an announcement that
 * was already published and hand-corrected rewrites the draft only — the
 * published TOR keeps the human's edits.
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
    /** Announcement page this was ingested from. */
    pdfUrl: { type: String, default: "" },
    /** Set once published; a draft with this set has a counterpart in `tors`. */
    publishedTorId: { type: Schema.Types.ObjectId, ref: "Tor", default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export type TorDraftDoc = HydratedDocument<InferSchemaType<typeof torDraftSchema>>

// Stashes whether this document was new *before* the save, since `isNew`
// flips to false the moment the save succeeds and the post hook below needs
// to know which case it's in.
torDraftSchema.pre("save", function (next) {
  this.$locals.wasNew = this.isNew
  next()
})

/**
 * Auto-publishes a newly created draft that meets the confidence bar, so a
 * high-confidence TOR doesn't sit in the review queue waiting on a human who
 * would have approved it anyway. Only fires once, on the draft's first save
 * — `findOneAndUpdate`-style upserts don't run "save" middleware at all, so
 * an ingestion path must create drafts with `.save()` / `Model.create()` for
 * this to apply.
 */
torDraftSchema.post("save", async function (doc) {
  if (!doc.$locals.wasNew) return
  if (doc.publishedTorId) return
  if (doc.aiConfidence < AUTO_APPROVE_CONFIDENCE_THRESHOLD) return

  const missingField = missingRequiredEnglishField(doc)
  if (missingField) {
    console.warn(
      `[tor-draft] ${doc.announcementNo} scored ${doc.aiConfidence} but is missing "${missingField}" — leaving for manual review instead of auto-publishing`
    )
    return
  }

  try {
    const published = await publishDraftContent(doc)
    doc.set({
      reviewStatus: "auto-approved",
      publishedTorId: published._id,
      publishedAt: new Date(),
    })
    await doc.save()
    await notifyCompaniesForTor(published).catch((error) => {
      console.error("notifyCompaniesForTor failed", error)
    })
  } catch (error) {
    console.error(`[tor-draft] auto-publish failed for ${doc.announcementNo}`, error)
  }
})

export const TorDraft = model("TorDraft", torDraftSchema)
