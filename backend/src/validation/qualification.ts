import { z } from "zod"

import {
  CERTIFICATION_IDS,
  COMPANY_SIZE_ORDER,
  EGP_STATUSES,
  NUMERIC_OPERATORS,
  SIZE_OPERATORS,
  SPECIALIZATION_IDS,
} from "@/domain/qualification-taxonomy"

/**
 * The machine-checkable form of a qualification.
 *
 * `type` is always the row's canonical `key` (see domain/qualification-taxonomy),
 * so the vocabulary the extraction assigns and the vocabulary the matcher
 * evaluates are the same one and cannot drift.
 *
 * The shapes mirror the admin review screen's criteria editor exactly. They
 * used to differ — the editor offered five comparison operators, a required
 * e-GP status and two rule types the matcher had never heard of — and because
 * this union is `.strict()`, anything a reviewer configured failed to parse and
 * the row silently reported "insufficient data". The editor is the product
 * surface, so the matcher follows it.
 */

const amount = z.number().finite().nonnegative()

export const qualificationCriteriaSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("registered-capital"),
    op: z.enum(NUMERIC_OPERATORS),
    amountThb: amount,
  }).strict(),
  z.object({
    type: z.literal("past-contract"),
    op: z.enum(NUMERIC_OPERATORS),
    amountThb: amount,
  }).strict(),
  z.object({
    type: z.literal("certification"),
    mode: z.enum(["any", "all"]),
    // At least one certificate: a rule naming none can never be satisfied, and
    // storing it would read as a requirement the bidder always fails.
    ids: z.array(z.enum(CERTIFICATION_IDS)).min(1),
    /**
     * Standards outside the four a profile can hold. They can never match by
     * equality, so the matcher reports them as something the profile cannot
     * answer and hands them to the bidder — never as a failure.
     */
    customIds: z.array(z.string().trim().min(1)).optional(),
  }).strict(),
  z.object({
    type: z.literal("egp-registered"),
    requiredStatus: z.enum(EGP_STATUSES),
  }).strict(),
  z.object({ type: z.literal("not-blacklisted") }).strict(),
  z.object({
    type: z.literal("company-size"),
    op: z.enum(SIZE_OPERATORS),
    size: z.enum(COMPANY_SIZE_ORDER),
  }).strict(),
  z.object({
    type: z.literal("specialization"),
    mode: z.enum(["any", "all"]),
    ids: z.array(z.enum(SPECIALIZATION_IDS)).min(1),
  }).strict(),
  z.object({ type: z.literal("manual") }).strict(),
])

export type QualificationCriteria = z.infer<typeof qualificationCriteriaSchema>

/** The rule that asks the bidder, used wherever a criteria cannot be built. */
export const MANUAL_CRITERIA: QualificationCriteria = { type: "manual" }
