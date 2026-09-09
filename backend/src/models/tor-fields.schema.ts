import { Schema, type SchemaDefinition } from "mongoose"
import {
  localizedListSchema,
  localizedTextSchema,
} from "@/models/localized.schema"

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
export const PROCUREMENT_STATUSES = ["open", "closing-soon", "closed", "awarded"] as const

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
    /** Stable key the company profile matches against (CompanyProfileMatch.requirementId). */
    id: { type: String, required: true },
    requirement: { type: localizedTextSchema, required: true },
    torCriteria: { type: localizedTextSchema, required: true },
    autoCheckable: { type: Boolean, default: false },
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
  deadline: { type: String, required: true },
  announcementDate: { type: String, required: true },
  sourceUrl: { type: String, default: "" },
  summary: { type: localizedTextSchema, required: true },
  deliverables: { type: localizedListSchema, default: () => ({}) },
  techTags: { type: [String], default: [], index: true },
  listTags: { type: [String], default: [] },
  financials: { type: financialsSchema, required: true },
  qualificationRequirements: { type: [qualificationRequirementSchema], default: [] },
} satisfies SchemaDefinition
