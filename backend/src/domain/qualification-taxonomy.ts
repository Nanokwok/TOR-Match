import { createHash } from "node:crypto"

/**
 * The shared vocabulary every TOR announcement's qualifications are described in.
 *
 * Announcements word the same requirement differently — "ทุนจดทะเบียนไม่ต่ำกว่า
 * 2,000,000 บาท" and "ผู้ยื่นข้อเสนอต้องมีทุนจดทะเบียนชำระแล้ว…" are one thing —
 * so without a shared key nothing can be matched across announcements and every
 * row has to be read by a human.
 *
 * The vocabulary is deliberately bounded by the **Company Field** options the
 * admin review screen already offers (CRITERIA_FIELD_OPTIONS in the frontend).
 * A requirement this list cannot express is not approximated: it becomes
 * "manual" and the bidder confirms it themselves. Approximating is how
 * "ไม่เป็นบุคคลล้มละลาย" ended up stored as `Registered Capital >= 0 THB`, which
 * passes every company on earth.
 *
 * This module is deliberately dependency-free — no mongoose, no project
 * imports, no zod. `validation/qualification.ts` builds a zod v3 union from it
 * while `scraper/extract.ts` builds a zod v4 enum from it, and both must see
 * the same tuples.
 */

/**
 * A requirement's canonical kind. This is also the `criteria.type` a row of
 * that kind carries: one concept, one name, so the extraction vocabulary and
 * the matching vocabulary cannot drift apart.
 */
export const QUALIFICATION_KEYS = [
  "registered-capital",
  "past-contract",
  "certification",
  "egp-registered",
  "not-blacklisted",
  "company-size",
  "specialization",
  "manual",
] as const

export type QualificationKey = (typeof QUALIFICATION_KEYS)[number]

/** The certificates a company profile can actually hold. */
export const CERTIFICATION_IDS = ["iso-29110", "iso-27001", "cmmi-2", "iso-9001"] as const
export type CertificationId = (typeof CERTIFICATION_IDS)[number]

/** The capability tags a company profile can actually hold. */
export const SPECIALIZATION_IDS = [
  "software-development",
  "system-maintenance",
  "data-ai",
  "mobile-app",
] as const

/** Smallest first — `company-size` with ">=" compares positions in this tuple. */
export const COMPANY_SIZE_ORDER = ["micro", "small", "medium", "large"] as const

export const EGP_STATUSES = ["registered", "in-progress", "not-registered"] as const

/** Comparisons the admin criteria editor offers; the matcher must honour all of them. */
export const NUMERIC_OPERATORS = ["<", "<=", "=", ">=", ">"] as const
export type NumericOperator = (typeof NUMERIC_OPERATORS)[number]

export const SIZE_OPERATORS = ["=", ">="] as const

/** Which wizard step a profile field is edited on, for the "go fill it" link. */
export type WizardStep =
  | "general"
  | "financial"
  | "certifications"
  | "past-performance"
  | "capabilities"

export type LocalizedText = { en: string; th: string }

export type ProfileField = {
  /** Path on the Company model. Asserted against the real schema by a test. */
  name: string
  wizardStep: WizardStep
  label: LocalizedText
}

export type TaxonomyEntry = {
  key: QualificationKey
  label: LocalizedText
  /** What the extraction has to pull out of the document besides the wording. */
  thresholdKind: "thb" | "certifications" | "size" | "specializations" | "none"
  /** The company-profile field that answers it, or null when nothing can. */
  profileField: ProfileField | null
}

export const QUALIFICATION_TAXONOMY: readonly TaxonomyEntry[] = [
  {
    key: "registered-capital",
    label: { en: "Registered capital", th: "ทุนจดทะเบียน" },
    thresholdKind: "thb",
    profileField: {
      name: "registeredCapitalThb",
      wizardStep: "financial",
      label: { en: "Registered capital", th: "ทุนจดทะเบียน" },
    },
  },
  {
    key: "past-contract",
    label: { en: "Past contract value", th: "มูลค่าผลงานที่ผ่านมา" },
    thresholdKind: "thb",
    profileField: {
      name: "pastProjects",
      wizardStep: "past-performance",
      label: { en: "Past project contract values", th: "มูลค่าสัญญาผลงานที่ผ่านมา" },
    },
  },
  {
    key: "certification",
    label: { en: "Certifications", th: "ใบรับรองมาตรฐาน" },
    thresholdKind: "certifications",
    profileField: {
      name: "certifications",
      wizardStep: "certifications",
      label: { en: "Certifications", th: "ใบรับรองมาตรฐาน" },
    },
  },
  {
    key: "egp-registered",
    label: { en: "e-GP registration", th: "การลงทะเบียน e-GP" },
    thresholdKind: "none",
    profileField: {
      name: "egpStatus",
      wizardStep: "financial",
      label: { en: "e-GP registration status", th: "สถานะการลงทะเบียน e-GP" },
    },
  },
  {
    key: "not-blacklisted",
    label: { en: "Not a defaulting contractor", th: "ไม่เป็นผู้ทิ้งงาน" },
    thresholdKind: "none",
    profileField: {
      name: "notBlacklisted",
      wizardStep: "financial",
      label: { en: "Blacklist declaration", th: "คำรับรองว่าไม่เป็นผู้ทิ้งงาน" },
    },
  },
  {
    key: "company-size",
    label: { en: "Company size", th: "ขนาดกิจการ" },
    thresholdKind: "size",
    profileField: {
      name: "companySize",
      wizardStep: "general",
      label: { en: "Company size", th: "ขนาดกิจการ" },
    },
  },
  {
    key: "specialization",
    label: { en: "Specialization", th: "ความเชี่ยวชาญ" },
    thresholdKind: "specializations",
    profileField: {
      name: "specializations",
      wizardStep: "capabilities",
      label: { en: "Specializations", th: "ความเชี่ยวชาญ" },
    },
  },
  {
    key: "manual",
    label: { en: "Manual check", th: "ตรวจสอบเอง" },
    thresholdKind: "none",
    profileField: null,
  },
]

const BY_KEY = new Map(QUALIFICATION_TAXONOMY.map((entry) => [entry.key, entry]))

export function taxonomyEntry(key: QualificationKey): TaxonomyEntry {
  const entry = BY_KEY.get(key)
  // Unreachable while `key` is typed, but a stored document can hold anything.
  if (!entry) throw new Error(`Unknown qualification key: ${key}`)
  return entry
}

export function isQualificationKey(value: unknown): value is QualificationKey {
  return typeof value === "string" && BY_KEY.has(value as QualificationKey)
}

/**
 * Identifies the requirement a self-check answer was given about.
 *
 * A bidder confirming "yes, our past work covers this scope" is answering one
 * specific clause. If a re-scrape raises the threshold or rewrites the clause,
 * honouring the old tick would report compliance the bidder never claimed — so
 * the answer is compared against this and shown as stale instead.
 *
 * Deliberately keyed on the Thai wording, not the English: the Thai is copied
 * from the document, while the English is re-translated on every extraction and
 * would churn the fingerprint without the requirement having changed.
 */
export function criteriaFingerprint(
  key: QualificationKey,
  criteria: unknown,
  torCriteriaTh: string
): string {
  return createHash("sha1")
    .update(`${key}::${stableStringify(criteria)}::${torCriteriaTh.trim()}`)
    .digest("hex")
    .slice(0, 16)
}

/** Key order must not change the fingerprint; JSON.stringify alone would. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null"
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, item]) => `${JSON.stringify(name)}:${stableStringify(item)}`)
  return `{${entries.join(",")}}`
}
