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
    sourceJobId: { type: Schema.Types.ObjectId, ref: "ScrapeJob", default: null },
    /** Set once published; a draft with this set has a counterpart in `tors`. */
    publishedTorId: { type: Schema.Types.ObjectId, ref: "Tor", default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export type TorDraftDoc = HydratedDocument<InferSchemaType<typeof torDraftSchema>>

export const TorDraft = model("TorDraft", torDraftSchema)
