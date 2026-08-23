import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"

/** Mirrors src/types/company-setup.ts (CompanySetupProfile) on the frontend. */
const certificationSchema = new Schema(
  {
    id: { type: String, required: true },
    selected: { type: Boolean, default: false },
    certificateNumber: { type: String, default: "" },
    expirationDate: { type: String, default: "" },
  },
  { _id: false }
)

const pastProjectSchema = new Schema(
  {
    title: { type: String, required: true },
    clientSector: { type: String, default: "" },
    contractValueThb: { type: String, default: "" },
    completionYear: { type: String, default: "" },
  },
  { timestamps: false }
)

const companySchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyNameThai: { type: String, default: "" },
    companyNameEnglish: { type: String, default: "" },
    taxId: { type: String, default: "" },
    companySize: { type: String, enum: ["micro", "small", "medium", "large", ""], default: "" },
    contactEmail: { type: String, default: "" },
    phone: { type: String, default: "" },
    registeredCapitalThb: { type: String, default: "" },
    egpStatus: {
      type: String,
      enum: ["registered", "in-progress", "not-registered"],
      default: "not-registered",
    },
    notBlacklisted: { type: Boolean, default: true },
    certifications: { type: [certificationSchema], default: [] },
    pastProjects: { type: [pastProjectSchema], default: [] },
    techStack: { type: [String], default: [] },
    specializations: { type: [String], default: [] },
  },
  { timestamps: true }
)

export type CompanyDoc = HydratedDocument<InferSchemaType<typeof companySchema>>

export const Company = model("Company", companySchema)
