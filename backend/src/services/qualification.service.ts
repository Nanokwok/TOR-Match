import {
  COMPANY_SIZE_ORDER,
  criteriaFingerprint,
  taxonomyEntry,
  type NumericOperator,
  type QualificationKey,
} from "@/domain/qualification-taxonomy"
import { qualificationCriteriaSchema, type QualificationCriteria } from "@/validation/qualification"

type LocalizedText = { en: string; th: string }
export type QualificationStatus = "passed" | "failed" | "insufficient-data" | "manual-review"
type CompanyInput = {
  registeredCapitalThb?: string
  egpStatus?: string
  notBlacklisted?: boolean
  companySize?: string
  specializations?: string[]
  certifications?: { id: string; selected?: boolean; certificateNumber?: string; expirationDate?: string }[]
  pastProjects?: { title: string; contractValueThb?: string }[]
}
type Requirement = {
  id: string
  key?: string
  requirement: LocalizedText
  torCriteria: LocalizedText
  autoCheckable?: boolean
  criteria?: unknown
}
/** What the bidder said about a requirement the profile could not answer. */
export type SelfCheckEntry = {
  requirementId: string
  answer: boolean
  criteriaFingerprint: string
}
const reason = (en: string, th: string): LocalizedText => ({ en, th })

function parseAmount(value?: string): number | null {
  const cleaned = value?.trim().replace(/,/g, "")
  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const amount = Number(cleaned)
  return Number.isFinite(amount) ? amount : null
}

// Certificate dates are calendar dates: valid through the end of that date in Bangkok.
function validDate(value?: string): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null
}

/** The admin criteria editor offers all five; the matcher must honour all five. */
function compare(value: number, op: NumericOperator, threshold: number): boolean {
  switch (op) {
    case "<": return value < threshold
    case "<=": return value <= threshold
    case "=": return value === threshold
    case ">=": return value >= threshold
    case ">": return value > threshold
  }
}

/**
 * Reduces a stored requirement to what identifies it: its rule, its key, and
 * the fingerprint a self-check answer is filed under.
 *
 * Shared with the self-check endpoint so the fingerprint an answer is saved
 * with and the one it is later compared against cannot be computed differently.
 */
export function requirementIdentity(requirement: {
  criteria?: unknown
  torCriteria: LocalizedText
}) {
  const parsed = qualificationCriteriaSchema.safeParse(requirement.criteria)
  // An unconfigured or malformed rule is not an error to show the bidder — it
  // is a requirement the system cannot check, which is what "manual" means.
  const criteria: QualificationCriteria = parsed.success ? parsed.data : { type: "manual" }
  const key = criteria.type as QualificationKey
  return {
    key,
    criteria,
    fingerprint: criteriaFingerprint(key, criteria, requirement.torCriteria.th),
  }
}

export function matchCompanyToTor(
  company: CompanyInput | null,
  tor: { qualificationRequirements: readonly Requirement[] },
  now = new Date(),
  selfCheck: readonly SelfCheckEntry[] = [],
) {
  const today = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const answers = new Map(selfCheck.map((entry) => [entry.requirementId, entry]))

  const rows = tor.qualificationRequirements.map((requirement) => {
    const { key, criteria, fingerprint } = requirementIdentity(requirement)
    const entry = taxonomyEntry(key)

    // What the row would say with no help from the bidder. `eligible` is built
    // from this, so a tick can never turn into an automated verification.
    const auto = evaluate(criteria, company, today)

    // The bidder is asked exactly when the system cannot answer: either the
    // requirement has no machine-checkable form, or their profile is missing
    // what this announcement needs. Without a profile there is nothing to
    // attach an answer to, so they are sent to set one up instead.
    const selfCheckable =
      company !== null && (criteria.type === "manual" || auto.status === "insufficient-data")

    const stored = selfCheckable ? answers.get(requirement.id) : undefined
    const live = stored && stored.criteriaFingerprint === fingerprint ? stored : undefined

    const answered = live
      ? {
          status: (live.answer ? "passed" : "failed") as QualificationStatus,
          reason: live.answer
            ? reason("You confirmed this yourself; not verified against a document.", "คุณยืนยันด้วยตนเอง ยังไม่ได้ตรวจกับเอกสาร")
            : reason("You indicated your company does not meet this.", "คุณระบุว่าบริษัทไม่ผ่านข้อนี้"),
          companyValue: null,
        }
      : null

    const shown = answered ?? auto

    return {
      requirementId: requirement.id,
      key,
      keyLabel: entry.label,
      requirement: requirement.requirement,
      torCriteria: requirement.torCriteria,
      companyValue: shown.companyValue,
      passed: shown.status === "passed" ? true : shown.status === "failed" ? false : null,
      status: shown.status,
      reason: shown.reason,
      autoCheckable: criteria.type !== "manual",
      selfCheckable,
      selfCheckAnswer: live ? live.answer : null,
      /** An answer given against a different version of this requirement. */
      selfCheckStale: Boolean(stored && !live),
      criteriaFingerprint: fingerprint,
      /** Which profile field would answer this, and whether it holds a usable value. */
      profileField: entry.profileField
        ? { ...entry.profileField, filled: company !== null && auto.status !== "insufficient-data" }
        : null,
      /** Kept off the response shape's happy path: used only to derive `eligible`. */
      autoStatus: auto.status,
    }
  })

  const automatic = rows.filter((row) => row.autoCheckable)
  // Eligibility here means passing every automated criterion, never final bid
  // approval — and never anything the bidder told us about themselves, because
  // this is what sends the "you now qualify" notification.
  const eligible =
    company !== null &&
    automatic.length > 0 &&
    automatic.every((row) => row.autoStatus === "passed") &&
    !rows.some((row) => row.autoStatus === "insufficient-data")
  const status: QualificationStatus = rows.some((row) => row.status === "failed") ? "failed"
    : !company || !rows.length || rows.some((row) => row.status === "insufficient-data") ? "insufficient-data"
    : rows.some((row) => row.status === "manual-review") ? "manual-review" : "passed"
  // Every requirement accounted for, whether verified by us or confirmed by the
  // bidder. This is what the TOR page shows; `eligible` is what filters browse.
  const readyToBid = company !== null && rows.length > 0 && rows.every((row) => row.status === "passed")

  return {
    profileSetup: company !== null,
    eligible,
    readyToBid,
    status,
    requiresManualReview: rows.some((row) => row.status === "manual-review"),
    /** Requirements this company's profile cannot answer for this announcement. */
    missingProfileFields: rows.filter((row) => row.profileField && !row.profileField.filled).length,
    evaluatedAt: now.toISOString(),
    rows: rows.map(({ autoStatus: _autoStatus, ...row }) => row),
  }
}

type Evaluation = { status: QualificationStatus; reason: LocalizedText; companyValue: string | null }

const result = (status: QualificationStatus, explanation: LocalizedText, companyValue: string | null = null): Evaluation =>
  ({ status, reason: explanation, companyValue })

function evaluate(criteria: QualificationCriteria, company: CompanyInput | null, today: string): Evaluation {
  if (criteria.type === "manual") return result("manual-review", reason("Requires document or human review.", "ต้องตรวจเอกสารหรือให้ผู้รับผิดชอบตรวจสอบ"))
  if (!company) return result("insufficient-data", reason("Set up your company profile first.", "กรุณาบันทึกข้อมูลบริษัทก่อน"))
  switch (criteria.type) {
    case "registered-capital": {
      const amount = parseAmount(company.registeredCapitalThb)
      if (amount === null) return result("insufficient-data", reason("Registered capital is missing or invalid.", "ทุนจดทะเบียนยังไม่ครบหรือไม่ถูกต้อง"))
      return result(compare(amount, criteria.op, criteria.amountThb) ? "passed" : "failed", reason("Compared registered capital with the required threshold.", "เปรียบเทียบทุนจดทะเบียนกับเกณฑ์ที่กำหนด"), `${amount.toLocaleString("en-US")} THB`)
    }
    case "past-contract": {
      const projects = (company.pastProjects ?? []).filter((project) => project.title.trim())
      const values = projects.map((project) => parseAmount(project.contractValueThb))
      const amounts = values.filter((value): value is number => value !== null)
      // Largest single contract, never the sum: a TOR asks for one contract of
      // at least this value, and work scope is reviewed separately.
      const max = amounts.length ? Math.max(...amounts) : null
      if (max !== null && compare(max, criteria.op, criteria.amountThb)) return result("passed", reason("At least one contract meets the threshold; work scope is reviewed separately.", "มีสัญญาอย่างน้อยหนึ่งฉบับถึงเกณฑ์ โดยตรวจประเภทงานแยกต่างหาก"), `${max.toLocaleString("en-US")} THB`)
      if (!projects.length || values.includes(null)) return result("insufficient-data", reason("Add complete past contract values.", "กรุณาระบุมูลค่าสัญญาผลงานที่ผ่านมาให้ครบ"))
      return result("failed", reason("No individual contract meets the threshold.", "ไม่มีสัญญารายฉบับที่ถึงเกณฑ์"), `${max?.toLocaleString("en-US")} THB`)
    }
    case "certification": {
      const certificates = company.certifications ?? []
      const states = criteria.ids.map((id) => {
        const selected = certificates.filter((cert) => cert.id === id && cert.selected)
        if (!selected.length) return "failed"
        if (selected.some((cert) => cert.certificateNumber?.trim() && validDate(cert.expirationDate) && cert.expirationDate! >= today)) return "passed"
        if (selected.some((cert) => !cert.certificateNumber?.trim() || !validDate(cert.expirationDate))) return "insufficient-data"
        return "failed"
      })
      // A standard outside the four a profile can hold can never match by
      // equality — reporting it as a failure would be a false accusation, so it
      // becomes something the bidder answers.
      if (criteria.customIds?.length) states.push("insufficient-data")
      const status: QualificationStatus = criteria.mode === "any"
        ? states.includes("passed") ? "passed" : states.includes("insufficient-data") ? "insufficient-data" : "failed"
        : states.includes("failed") ? "failed" : states.includes("insufficient-data") ? "insufficient-data" : "passed"
      return result(status, reason("Required certificates must have a number and remain valid today (Bangkok time).", "ใบรับรองที่กำหนดต้องมีเลขที่และยังไม่หมดอายุ ณ วันนี้ตามเวลาไทย"), certificates.filter((cert) => cert.selected && (criteria.ids as readonly string[]).includes(cert.id)).map((cert) => `${cert.id}: ${cert.certificateNumber || "—"} (${cert.expirationDate || "—"})`).join(", ") || null)
    }
    case "egp-registered":
      if (!company.egpStatus) return result("insufficient-data", reason("e-GP status is missing.", "ยังไม่มีข้อมูลสถานะ e-GP"))
      return result(company.egpStatus === criteria.requiredStatus ? "passed" : "failed", reason("An e-GP vendor registration is required.", "ต้องลงทะเบียนเป็นผู้ค้า e-GP"), company.egpStatus)
    case "not-blacklisted":
      if (typeof company.notBlacklisted !== "boolean") return result("insufficient-data", reason("Blacklist declaration is missing.", "ยังไม่มีข้อมูลยืนยันสถานะบัญชีดำ"))
      return result(company.notBlacklisted ? "passed" : "failed", reason("Based on the company's saved declaration; no external registry verification.", "อ้างอิงคำรับรองที่บริษัทบันทึก ยังไม่ได้ตรวจทะเบียนภายนอก"), null)
    case "company-size": {
      const index = COMPANY_SIZE_ORDER.indexOf(company.companySize as (typeof COMPANY_SIZE_ORDER)[number])
      if (index < 0) return result("insufficient-data", reason("Company size is missing.", "ยังไม่ได้ระบุขนาดกิจการ"))
      const required = COMPANY_SIZE_ORDER.indexOf(criteria.size)
      const passed = criteria.op === "=" ? index === required : index >= required
      return result(passed ? "passed" : "failed", reason("Compared company size with the required size.", "เปรียบเทียบขนาดกิจการกับขนาดที่กำหนด"), company.companySize ?? null)
    }
    case "specialization": {
      const held = company.specializations ?? []
      if (!held.length) return result("insufficient-data", reason("No specializations recorded.", "ยังไม่ได้ระบุความเชี่ยวชาญ"))
      const matched = criteria.ids.filter((id) => held.includes(id))
      const passed = criteria.mode === "any" ? matched.length > 0 : matched.length === criteria.ids.length
      return result(passed ? "passed" : "failed", reason("Compared the company's specializations with the ones required.", "เปรียบเทียบความเชี่ยวชาญของบริษัทกับที่กำหนด"), held.join(", ") || null)
    }
  }
}
