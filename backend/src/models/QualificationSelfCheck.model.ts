import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"

import { QUALIFICATION_KEYS } from "@/domain/qualification-taxonomy"

/**
 * What a bidder said about the requirements the system could not check for them.
 *
 * A TOR's qualifications split two ways: the ones a company profile answers
 * (ทุนจดทะเบียน against `registeredCapitalThb`, and so on) and the ones nothing
 * in the profile can speak to — "ไม่เป็นบุคคลล้มละลาย", "มีผลงานประเภทเดียวกัน".
 * The second kind used to sit in the UI as a checkbox that forgot its state on
 * reload. This is where it is kept.
 *
 * Scoped to the company rather than the user: the profile and the matching are
 * company-scoped already, and two people at one company must not see
 * contradictory answers about their own company.
 *
 * Answers are per-TOR and never shared between announcements, even for the same
 * requirement key. "ผลงานไม่น้อยกว่า 1,500,000 บาท" on a web-app contract is not
 * the requirement "ผลงานไม่น้อยกว่า 8,000,000 บาท" on a CCTV one, and carrying a
 * "yes" across would be the worst failure this tool could have.
 */

const selfCheckEntrySchema = new Schema(
  {
    /** The requirement's id within its TOR. */
    requirementId: { type: String, required: true },
    /** Denormalised from the requirement, so answers stay readable after a re-scrape. */
    key: { type: String, enum: QUALIFICATION_KEYS, default: "manual" },
    answer: { type: Boolean, required: true },
    /**
     * Identifies the version of the requirement that was answered.
     *
     * A re-scrape can raise a threshold or reword a clause under the same id.
     * Comparing this on read means an answer given to the old wording is shown
     * as stale and re-asked, instead of silently reported as still true.
     */
    criteriaFingerprint: { type: String, required: true },
    note: { type: String, default: "" },
    answeredAt: { type: Date, required: true },
  },
  { _id: false }
)

const qualificationSelfCheckSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    torId: { type: Schema.Types.ObjectId, ref: "Tor", required: true, index: true },
    entries: { type: [selfCheckEntrySchema], default: [] },
  },
  { timestamps: true }
)

// One document per company per TOR; the API replaces its entries wholesale.
qualificationSelfCheckSchema.index({ companyId: 1, torId: 1 }, { unique: true })

export type QualificationSelfCheckDoc = HydratedDocument<
  InferSchemaType<typeof qualificationSelfCheckSchema>
>

export const QualificationSelfCheck = model(
  "QualificationSelfCheck",
  qualificationSelfCheckSchema
)
