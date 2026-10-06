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
export const PROCUREMENT_STATUSES = ["draft", "open", "closing-soon", "closed", "awarded"] as const

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
