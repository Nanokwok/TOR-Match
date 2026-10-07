import { Schema, type SchemaDefinition } from "mongoose"
import {
  localizedListSchema,
  localizedTextSchema,
} from "@/models/localized.schema"
import { QUALIFICATION_KEYS } from "@/domain/qualification-taxonomy"
import { qualificationCriteriaSchema } from "@/validation/qualification"

/**
 * The content of a TOR, shared by the published {@link Tor} collection and the
 * unpublished {@link TorDraft} staging collection. Both hold the same shape —
 * a draft is a TOR that no human has approved yet — so the field definitions
 * live here once rather than drifting between two copies.
 */

export const PROJECT_SCALES = ["SMALL", "MEDIUM", "LARGE", "ENTERPRISE"] as const
export const PROCUREMENT_METHODS = [
  "e-bidding",
  "e-market",
  "selective",
  "specific",
  "price-agreement",
] as const
/**
 * Where a project stands, in the vocabulary the e-GP announcements use.
 *
 * `draft` is before bidding opens — B0 ร่างเอกสารประกวดราคา / ประชาพิจารณ์, which
 * states no closing date; the timeline stepper reads it as its first stage
 * (see frontend lib/deadline.ts). The next three describe an open procurement,
 * and the last four are what later announcements say became of it — D1
 * ยกเลิกประกาศเชิญชวน, D2 เปลี่ยนแปลงประกาศ, W1 ยกเลิกประกาศผู้ชนะ, W2
 * เปลี่ยนแปลงประกาศผู้ชนะ. `awarded` is W0.
 *
 * Set from the announcement type, never from the extraction model: which
 * announcement was published is a fact, and a model reading a tender document
 * has no way to know one was cancelled a week later.
 */
export const PROCUREMENT_STATUSES = [
  "draft",
  "open",
  "closing-soon",
  "closed",
  "awarded",
  "cancelled",
  "changed",
  "winner-cancelled",
  "winner-revised",
] as const

/**
 * The statuses a company can still act on.
 *
 * Match notifications and eligibility checking key on this rather than listing
 * statuses inline, so adding a lifecycle status cannot silently start
 * advertising a cancelled project — or one whose bidding has not opened.
 */
export const BIDDABLE_STATUSES = ["open", "closing-soon"] as const

const paymentMilestoneSchema = new Schema(
  {
    day: { type: Number, required: true },
    milestoneNumber: { type: Number, required: true },
    percent: { type: Number, required: true },
    amountBaht: { type: Number, required: true },
    deliverable: { type: localizedTextSchema, required: true },
  },
  { _id: false }
)

const financialsSchema = new Schema(
  {
    totalBudgetBaht: { type: Number, required: true },
    medianPriceBaht: { type: Number, required: true },
    method: { type: String, enum: PROCUREMENT_METHODS, required: true },
    milestones: { type: [paymentMilestoneSchema], default: [] },
  },
  { _id: false }
)

/**
 * Every announcement the feed has published for this project, in the order
 * they were seen.
 *
 * A project is announced repeatedly as it moves — the plan, the median price,
 * the tender, the invitation, its amendments, the winner — and each is a
 * separate document a bidder may want to read. Storing them all means the app
 * can show the history rather than only the two documents an extraction
 * happened to read, and a later run can tell what is genuinely new.
 *
 * Keyed by (announceType, url): a re-published D2 or W2 arrives as a new row
 * rather than replacing the earlier one, because both were really published.
 */
const announcementLinkSchema = new Schema(
  {
    /** `anounceType` as the CGD feed states it: P0, 15, B0, D0, D1, D2, W0, W1, W2. */
    announceType: { type: String, required: true },
    /** The feed's own Thai wording for the type, e.g. "ประกาศเชิญชวน". */
    announceLabel: { type: String, default: "" },
    url: { type: String, required: true },
    /** YYYY-MM-DD as published, which is not the date we saw it. */
    publishedDate: { type: String, default: "" },
    title: { type: String, default: "" },
    seenAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const qualificationRequirementSchema = new Schema(
  {
    /**
     * Unique within this announcement. Referenced by a bidder's stored
     * self-check answers, so it must survive a re-scrape of the same document.
     */
    id: { type: String, required: true },
    /**
     * The shared vocabulary key — the same slug across every announcement that
     * asks for this kind of thing, which is what lets a requirement be mapped
     * to a company-profile field automatically. Always equal to `criteria.type`.
     *
     * Defaulted rather than merely required so documents written before the
     * vocabulary existed still load; the backfill script fills them in.
     */
    key: { type: String, enum: QUALIFICATION_KEYS, default: "manual" },
    requirement: { type: localizedTextSchema, required: true },
    torCriteria: { type: localizedTextSchema, required: true },
    autoCheckable: { type: Boolean, default: false },
    criteria: {
      type: Schema.Types.Mixed,
      default: undefined,
      validate: {
        validator: (value: unknown) => value == null || qualificationCriteriaSchema.safeParse(value).success,
        message: "Invalid qualification criteria for its type",
      },
    },
  },
  { _id: false }
)

export const torContentFields = {
  announcementNo: { type: String, required: true, unique: true },
  /** Every announcement published for this project — see announcementLinkSchema. */
  announcements: { type: [announcementLinkSchema], default: [] },
  title: { type: localizedTextSchema, required: true },
  department: { type: localizedTextSchema, required: true },
  localOffice: { type: localizedTextSchema, required: true },
  budgetBaht: { type: Number, required: true },
  projectScale: { type: String, enum: PROJECT_SCALES, required: true },
  /** Canonical contract length. The display label is derived from this. */
  durationDays: { type: Number, required: true },
  method: { type: String, enum: PROCUREMENT_METHODS, required: true },
  status: { type: String, enum: PROCUREMENT_STATUSES, default: "open", index: true },
  // Empty when the source doesn't state one: a scraped announcement page has
  // no bid deadline, and TORs are published with whatever was scraped. The
  // UI renders an empty date as "not specified".
  deadline: { type: String, default: "" },
  announcementDate: { type: String, default: "" },
  sourceUrl: { type: String, default: "" },
  summary: { type: localizedTextSchema, required: true },
  deliverables: { type: localizedListSchema, default: () => ({}) },
  techTags: { type: [String], default: [], index: true },
  listTags: { type: [String], default: [] },
  financials: { type: financialsSchema, required: true },
  qualificationRequirements: { type: [qualificationRequirementSchema], default: [] },
} satisfies SchemaDefinition
