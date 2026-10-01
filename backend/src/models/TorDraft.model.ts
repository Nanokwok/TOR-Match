import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"
import {
  DEFAULT_ADMIN_SYSTEM_SETTINGS,
  SYSTEM_SETTINGS_SINGLETON_KEY,
  SystemSettings,
} from "@/models/SystemSettings.model"
import { torContentFields } from "@/models/tor-fields.schema"
import { publishBlocker, publishDraft } from "@/services/tor-publish.service"

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

/**
 * Fallback used only for the frontend's confidence-badge display bucketing,
 * not the actual auto-publish decision — that reads the live, admin-editable
 * value from SystemSettings (see the post-save hook below). Sourced from the
 * same default the settings collection seeds itself with, so there's one
 * place this magic number is defined.
 */
export const AUTO_APPROVE_CONFIDENCE_THRESHOLD = DEFAULT_ADMIN_SYSTEM_SETTINGS.autoApproveThreshold

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
 *
 * The enabled flag and threshold are read live from SystemSettings (the
 * same values /admin/settings edits) rather than a fixed constant, so an
 * admin can tune or turn off auto-approval without a deploy.
 */
torDraftSchema.post("save", async function (doc) {
  if (!doc.$locals.wasNew) return
  if (doc.publishedTorId) return

  const settings = await SystemSettings.findOneAndUpdate(
    { singletonKey: SYSTEM_SETTINGS_SINGLETON_KEY },
    { $setOnInsert: { singletonKey: SYSTEM_SETTINGS_SINGLETON_KEY, ...DEFAULT_ADMIN_SYSTEM_SETTINGS } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  if (!settings.autoApproveEnabled) return
  if (doc.aiConfidence < settings.autoApproveThreshold) return

  const blocker = publishBlocker(doc)
  if (blocker) {
    console.warn(
      `[tor-draft] ${doc.announcementNo} scored ${doc.aiConfidence} but cannot publish (${blocker}) — leaving for manual review instead of auto-publishing`
    )
    return
  }

  try {
    // publishDraft saves the draft itself (reviewStatus/publishedTorId/
    // publishedAt) and notifies companies — the same call the admin review
    // screen makes, just with "auto-approved" instead of "approved" so the
    // two paths stay visually distinguishable in the review queue.
    await publishDraft(doc, "auto-approved")
  } catch (error) {
    console.error(`[tor-draft] auto-publish failed for ${doc.announcementNo}`, error)
  }
})

export const TorDraft = model("TorDraft", torDraftSchema)
