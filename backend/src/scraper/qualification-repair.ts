import {
  classifyQualificationKey,
  isManualOnlyClause,
} from "@/domain/qualification-keys"
import {
  CERTIFICATION_IDS,
  isQualificationKey,
  taxonomyEntry,
  type CertificationId,
  type QualificationKey,
} from "@/domain/qualification-taxonomy"
import { parseThresholdThb, textStatesAmount } from "@/domain/qualification-thresholds"
import {
  qualificationCriteriaSchema,
  type QualificationCriteria,
} from "@/validation/qualification"

/**
 * Turns what the extraction model said about a qualification into a rule the
 * matcher can run — or, when the two sources disagree, into a manual row.
 *
 * Pure and offline on purpose: every judgement here is one a test can pin down,
 * and none of it should need a model call to re-check.
 *
 * The guiding rule is that a wrong rule is worse than no rule. A fabricated
 * threshold silently marks a bidder eligible or ineligible for a contract;
 * a manual row costs them one checkbox. So every ambiguity degrades.
 */

type LocalizedText = { en: string; th: string }

/** One qualification as the model reports it, before any verification. */
export type ExtractedQualification = {
  key: string
  requirement: LocalizedText
  torCriteria: LocalizedText
  thresholdThb: number
  certificationIds: string[]
  certificationMode: "any" | "all"
}

/** One qualification as it is stored on a TOR. */
export type StoredQualification = {
  id: string
  key: QualificationKey
  requirement: LocalizedText
  torCriteria: LocalizedText
  autoCheckable: boolean
  criteria: QualificationCriteria
}

const MANUAL: QualificationCriteria = { type: "manual" }

/**
 * Reconciles the model's key with what the Thai term lists say.
 *
 * The term lists win whenever they are confident, because a mis-keyed row is
 * the mechanism by which a company gets checked against the wrong profile
 * field and silently passed or failed on a number the clause is not about.
 */
function resolveKey(entry: ExtractedQualification): QualificationKey {
  const modelKey: QualificationKey = isQualificationKey(entry.key) ? entry.key : "manual"
  const text = `${entry.requirement.th} ${entry.torCriteria.th}`

  // A vetoed clause — net worth, years in business, bankruptcy — reads as
  // another requirement to a model skimming for keywords. The veto is evidence,
  // so it overrules whatever the model chose.
  if (isManualOnlyClause(text)) return "manual"

  const verdict = classifyQualificationKey(text)
  if (!verdict) return modelKey
  if (verdict.key === modelKey) return modelKey
  // The model found nothing but the terms did: recover the row.
  if (modelKey === "manual") return verdict.key
  // A genuine disagreement. STRONG terms were curated to be unambiguous, so
  // they overrule; WEAK ones only corroborate and defer to the model.
  return verdict.strength === "strong" ? verdict.key : modelKey
}

/**
 * The baht figure, once the document has confirmed it.
 *
 * The model picks which figure is the requirement — a job that needs the
 * sentence, since a capital clause states the contract band and the capital
 * floor side by side. The document is then checked for that figure, which
 * catches a misread or invented number without asking a regex to do the
 * reading. A figure the document does not state makes the row manual.
 */
function agreedThreshold(entry: ExtractedQualification): number | null {
  const text = `${entry.requirement.th} ${entry.torCriteria.th}`
  const fromModel = entry.thresholdThb > 0 ? entry.thresholdThb : null

  if (fromModel !== null) return textStatesAmount(text, fromModel) ? fromModel : null

  // No model answer to check — the backfill path. Then the document has to
  // state exactly one figure, or there is nothing to choose between them.
  return parseThresholdThb(entry.torCriteria.th) ?? parseThresholdThb(entry.requirement.th)
}

function buildCriteria(key: QualificationKey, entry: ExtractedQualification): QualificationCriteria {
  switch (taxonomyEntry(key).thresholdKind) {
    case "thb": {
      const amountThb = agreedThreshold(entry)
      if (amountThb === null) return MANUAL
      // Thai TORs state a floor ("ไม่น้อยกว่า"); the other operators exist for
      // an admin to set by hand, never for extraction to infer.
      return key === "registered-capital"
        ? { type: "registered-capital", op: ">=", amountThb }
        : { type: "past-contract", op: ">=", amountThb }
    }
    case "certifications": {
      const ids = entry.certificationIds.filter((id): id is CertificationId =>
        (CERTIFICATION_IDS as readonly string[]).includes(id)
      )
      // A certification rule naming no certificate can never be satisfied, so
      // it would read as a requirement the bidder always fails.
      if (!ids.length) return MANUAL
      return { type: "certification", mode: entry.certificationMode, ids: [...new Set(ids)] }
    }
    case "none":
      if (key === "egp-registered") return { type: "egp-registered", requiredStatus: "registered" }
      if (key === "not-blacklisted") return { type: "not-blacklisted" }
      return MANUAL
    // Company size and specialization have no phrasing a Thai TOR reliably
    // uses, so they exist for an admin to configure, never for extraction.
    case "size":
    case "specializations":
      return MANUAL
  }
}

/**
 * Ids are the key plus an ordinal, so an announcement listing two certification
 * clauses gets `certification` and `certification-2`.
 *
 * Human-readable and reproducible from the same document. It does shift if a
 * re-scrape reorders rows — which is what the stored self-check's fingerprint
 * detects, rather than a cleverer id trying to prevent it.
 */
function assignIds(keys: readonly QualificationKey[]): string[] {
  const seen = new Map<QualificationKey, number>()
  return keys.map((key) => {
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    return count === 1 ? key : `${key}-${count}`
  })
}

export function repairQualifications(
  entries: readonly ExtractedQualification[]
): StoredQualification[] {
  const resolved = entries.map((entry) => {
    const built = buildCriteria(resolveKey(entry), entry)
    // Belt and braces: nothing reaches the database that the matcher would then
    // refuse to parse, which is how rows used to become "insufficient data"
    // with no way to tell whether the bidder or the pipeline was at fault.
    const checked = qualificationCriteriaSchema.safeParse(built)
    const criteria = checked.success ? checked.data : MANUAL
    // `key` and `criteria.type` are one concept: a degraded row is a manual
    // row, not a capital row that happens to be unenforceable. Letting them
    // disagree is what makes a rule and its label drift apart.
    return { entry, criteria, key: criteria.type as QualificationKey }
  })

  const ids = assignIds(resolved.map((row) => row.key))

  return resolved.map(({ entry, criteria, key }, index) => ({
    id: ids[index],
    key,
    requirement: entry.requirement,
    torCriteria: entry.torCriteria,
    autoCheckable: criteria.type !== "manual",
    criteria,
  }))
}
