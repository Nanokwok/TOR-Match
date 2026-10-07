import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"
import {
  DEFAULT_ADMIN_SYSTEM_SETTINGS,
  SYSTEM_SETTINGS_SINGLETON_KEY,
  SystemSettings,
} from "@/models/SystemSettings.model"
import { torContentFields } from "@/models/tor-fields.schema"
import { publishBlocker, publishDraft } from "@/services/tor-publish.service"

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
    /**
     * The document the extraction read: the richest one available, which is a
     * B0 tender archive wherever the feed offered one.
     */
    pdfUrl: { type: String, default: "" },
    /**
     * The D0 ประกาศเชิญชวน, kept alongside pdfUrl rather than discarded.
     *
     * The two announcement types carry different things. B0 (ร่างเอกสารประกวดราคา)
     * holds the bidder qualifications but, being a draft, states no closing
     * date; D0 (ประกาศเชิญชวน) is a two-page notice that defers the
     * qualifications but does give the deadline — and, unlike the B0 archive,
     * opens in a browser rather than downloading. Keeping both means one
     * extraction reads both, and the published TOR links to the one a person
     * can actually open.
     */
    invitationUrl: { type: String, default: "" },
    /**
     * The website page carrying this announcement, where a person can read the
     * documents for themselves — distinct from the two links above, which are
     * files the pipeline reads.
     *
     * Neither the RSS feed nor e-GP offers one: the feed's <link> is always a
     * document, and e-GP reaches announcements through a portal search rather
     * than a constructible URL. It has to be resolved per project against the
     * publishing agency's own site, so it is empty whenever that lookup finds
     * nothing, and `sourceUrl` falls back to the document link.
     */
    detailUrl: { type: String, default: "" },
    /**
     * Fields a reviewer has edited by hand.
     *
     * A project is announced several times, and each announcement re-extracts.
     * Without this, the next one would quietly revert a correction someone made
     * on /admin/tor-review — so once a human has written a field, the model
     * stops being allowed to.
     */
    /**
     * Which announcement the stored median price came from.
     *
     * "15" means the official ราคากลาง form said so, and no later extraction
     * may overrule it — see tor-merge.ts.
     */
    medianPriceSource: { type: String, default: "" },
    medianPriceApprovedDate: { type: String, default: "" },
    lockedFields: { type: [String], default: [] },
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
      `[tor-draft] ${doc.announcementNo} scored ${doc.aiConfidence} but ${blocker} — leaving for manual review instead of auto-publishing`
    )
    return
  }

  try {
    const published = await publishDraft(doc)
    doc.set({
      reviewStatus: "auto-approved",
      publishedTorId: published._id,
      publishedAt: new Date(),
    })
    await doc.save()
  } catch (error) {
    console.error(`[tor-draft] auto-publish failed for ${doc.announcementNo}`, error)
  }
})

export const TorDraft = model("TorDraft", torDraftSchema)
