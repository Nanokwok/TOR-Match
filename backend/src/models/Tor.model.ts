import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"

/** Mirrors src/types/tor.ts (Tor) on the frontend. */
const paymentMilestoneSchema = new Schema(
  {
    day: { type: Number, required: true },
    milestoneNumber: { type: Number, required: true },
    percent: { type: Number, required: true },
    amountBaht: { type: Number, required: true },
    deliverable: { type: String, required: true },
    deliverableTh: { type: String },
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
    requirement: { type: String, required: true },
    requirementTh: { type: String },
    torCriteria: { type: String, required: true },
    torCriteriaTh: { type: String },
    autoCheckable: { type: Boolean, default: false },
  },
  { _id: false }
)

const torSchema = new Schema(
  {
    announcementNo: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleTh: { type: String },
    department: { type: String, required: true, index: true },
    departmentTh: { type: String },
    localOffice: { type: String, required: true },
    localOfficeTh: { type: String },
    budgetBaht: { type: Number, required: true },
    projectScale: {
      type: String,
      enum: ["SMALL", "MEDIUM", "LARGE", "ENTERPRISE"],
      required: true,
    },
    durationDays: { type: Number, required: true },
    durationLabel: { type: String, required: true },
    durationLabelTh: { type: String },
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
    summary: { type: String, default: "" },
    summaryTh: { type: String },
    deliverables: { type: [String], default: [] },
    deliverablesTh: { type: [String], default: [] },
    techTags: { type: [String], default: [], index: true },
    listTags: { type: [String], default: [] },
    financials: { type: financialsSchema, required: true },
    qualificationRequirements: { type: [qualificationRequirementSchema], default: [] },
  },
  { timestamps: true }
)

export type TorDoc = HydratedDocument<InferSchemaType<typeof torSchema>>

export const Tor = model("Tor", torSchema)
