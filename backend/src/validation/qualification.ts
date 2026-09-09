import { z } from "zod"

const amount = z.number().finite().nonnegative()
export const qualificationCriteriaSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("min-registered-capital"), minAmountThb: amount }).strict(),
  z.object({ type: z.literal("min-past-contract"), minAmountThb: amount }).strict(),
  z.object({
    type: z.literal("certification"),
    certificationIds: z.array(z.string().trim().min(1)).min(1),
    mode: z.enum(["any", "all"]),
  }).strict(),
  z.object({ type: z.literal("egp-registered") }).strict(),
  z.object({ type: z.literal("not-blacklisted") }).strict(),
  z.object({ type: z.literal("manual") }).strict(),
])
export type QualificationCriteria = z.infer<typeof qualificationCriteriaSchema>
