import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"
import {
  localizedListSchema,
  localizedTextSchema,
} from "@/models/localized.schema"

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
    method: {
      type: String,
      enum: ["e-bidding", "e-market", "selective", "specific", "price-agreement"],
      required: true,
    },
    milestones: { type: [paymentMilestoneSchema], default: [] },
  },
  { _id: false }
)

const qualificationRequirementSchema = new Schema(
  {
    requirement: { type: localizedTextSchema, required: true },
    torCriteria: { type: localizedTextSchema, required: true },
    autoCheckable: { type: Boolean, default: false },
  },
  { _id: false }
)

const torSchema = new Schema(
  {
    announcementNo: { type: String, required: true, unique: true },
    title: { type: localizedTextSchema, required: true },
    department: { type: localizedTextSchema, required: true },
    localOffice: { type: localizedTextSchema, required: true },
    budgetBaht: { type: Number, required: true },
    projectScale: {
      type: String,
      enum: ["SMALL", "MEDIUM", "LARGE", "ENTERPRISE"],
      required: true,
    },
    /** Canonical contract length. The display label is derived from this. */
    durationDays: { type: Number, required: true },
    method: {
      type: String,
      enum: ["e-bidding", "e-market", "selective", "specific", "price-agreement"],
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "closing-soon", "closed", "awarded"],
      default: "open",
      index: true,
    },
    deadline: { type: String, required: true },
    announcementDate: { type: String, required: true },
    sourceUrl: { type: String, default: "" },
    summary: { type: localizedTextSchema, required: true },
    deliverables: { type: localizedListSchema, default: () => ({}) },
    techTags: { type: [String], default: [], index: true },
    listTags: { type: [String], default: [] },
    financials: { type: financialsSchema, required: true },
    qualificationRequirements: { type: [qualificationRequirementSchema], default: [] },
  },
  { timestamps: true }
)

/** English is the canonical identity used for filtering and cross-referencing. */
torSchema.index({ "department.en": 1 })

export type TorDoc = HydratedDocument<InferSchemaType<typeof torSchema>>

export const Tor = model("Tor", torSchema)