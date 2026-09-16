import { qualificationCriteriaSchema } from "@/validation/qualification"

type LocalizedText = { en: string; th: string }
export type QualificationStatus = "passed" | "failed" | "insufficient-data" | "manual-review"
type CompanyInput = {
  registeredCapitalThb?: string
  egpStatus?: string
  notBlacklisted?: boolean
  certifications?: { id: string; selected?: boolean; certificateNumber?: string; expirationDate?: string }[]
  pastProjects?: { title: string; contractValueThb?: string }[]
}
type Requirement = {
  id: string
  requirement: LocalizedText
  torCriteria: LocalizedText
  autoCheckable?: boolean
  criteria?: unknown
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

export function matchCompanyToTor(
  company: CompanyInput | null,
  tor: { qualificationRequirements: readonly Requirement[] },
  now = new Date(),
) {
  const today = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const rows = tor.qualificationRequirements.map((requirement) => {
    const parsed = qualificationCriteriaSchema.safeParse(requirement.criteria)
    const base = {
      requirementId: requirement.id,
      requirement: requirement.requirement,
      torCriteria: requirement.torCriteria,
      autoCheckable: parsed.success ? parsed.data.type !== "manual" : Boolean(requirement.autoCheckable),
    }
    const result = (status: QualificationStatus, explanation: LocalizedText, companyValue: string | null = null) => ({
      ...base, status, reason: explanation, companyValue,
      passed: status === "passed" ? true : status === "failed" ? false : null,
    })
    if (!parsed.success) return result("insufficient-data", reason("Structured TOR criteria are missing or invalid.", "ข้อกำหนด TOR ยังไม่มีข้อมูลเชิงโครงสร้างที่ใช้ตรวจได้"))
    const criteria = parsed.data
    if (criteria.type === "manual") return result("manual-review", reason("Requires document or human review.", "ต้องตรวจเอกสารหรือให้ผู้รับผิดชอบตรวจสอบ"))
    if (!company) return result("insufficient-data", reason("Set up your company profile first.", "กรุณาบันทึกข้อมูลบริษัทก่อน"))
    switch (criteria.type) {
      case "min-registered-capital": {
        const amount = parseAmount(company.registeredCapitalThb)
        if (amount === null) return result("insufficient-data", reason("Registered capital is missing or invalid.", "ทุนจดทะเบียนยังไม่ครบหรือไม่ถูกต้อง"))
        return result(amount >= criteria.minAmountThb ? "passed" : "failed", reason("Compared registered capital with the required minimum.", "เปรียบเทียบทุนจดทะเบียนกับขั้นต่ำที่กำหนด"), `${amount.toLocaleString("en-US")} THB`)
      }
      case "min-past-contract": {
        const projects = (company.pastProjects ?? []).filter((project) => project.title.trim())
        const values = projects.map((project) => parseAmount(project.contractValueThb))
        const amounts = values.filter((value): value is number => value !== null)
        const max = amounts.length ? Math.max(...amounts) : null
        if (max !== null && max >= criteria.minAmountThb) return result("passed", reason("At least one contract meets the minimum value; work scope is reviewed separately.", "มีสัญญาอย่างน้อยหนึ่งฉบับมูลค่าถึงขั้นต่ำ โดยตรวจประเภทงานแยกต่างหาก"), `${max.toLocaleString("en-US")} THB`)
        if (!projects.length || values.includes(null)) return result("insufficient-data", reason("Add complete past contract values.", "กรุณาระบุมูลค่าสัญญาผลงานที่ผ่านมาให้ครบ"))
        return result("failed", reason("No individual contract meets the minimum value.", "ไม่มีสัญญารายฉบับที่มูลค่าถึงขั้นต่ำ"), `${max?.toLocaleString("en-US")} THB`)
      }
      case "certification": {
        const certificates = company.certifications ?? []
        const states = criteria.certificationIds.map((id) => {
          const selected = certificates.filter((cert) => cert.id === id && cert.selected)
          if (!selected.length) return "failed"
          if (selected.some((cert) => cert.certificateNumber?.trim() && validDate(cert.expirationDate) && cert.expirationDate! >= today)) return "passed"
          if (selected.some((cert) => !cert.certificateNumber?.trim() || !validDate(cert.expirationDate))) return "insufficient-data"
          return "failed"
        })
        const status: QualificationStatus = criteria.mode === "any"
          ? states.includes("passed") ? "passed" : states.includes("insufficient-data") ? "insufficient-data" : "failed"
          : states.includes("failed") ? "failed" : states.includes("insufficient-data") ? "insufficient-data" : "passed"
        return result(status, reason("Required certificates must have a number and remain valid today (Bangkok time).", "ใบรับรองที่กำหนดต้องมีเลขที่และยังไม่หมดอายุ ณ วันนี้ตามเวลาไทย"), certificates.filter((cert) => cert.selected && criteria.certificationIds.includes(cert.id)).map((cert) => `${cert.id}: ${cert.certificateNumber || "—"} (${cert.expirationDate || "—"})`).join(", ") || null)
      }
      case "egp-registered":
        if (!company.egpStatus) return result("insufficient-data", reason("e-GP status is missing.", "ยังไม่มีข้อมูลสถานะ e-GP"))
        return result(company.egpStatus === "registered" ? "passed" : "failed", reason("An e-GP vendor registration is required.", "ต้องลงทะเบียนเป็นผู้ค้า e-GP"), company.egpStatus)
      case "not-blacklisted":
        if (typeof company.notBlacklisted !== "boolean") return result("insufficient-data", reason("Blacklist declaration is missing.", "ยังไม่มีข้อมูลยืนยันสถานะบัญชีดำ"))
        return result(company.notBlacklisted ? "passed" : "failed", reason("Based on the company's saved declaration; no external registry verification.", "อ้างอิงคำรับรองที่บริษัทบันทึก ยังไม่ได้ตรวจทะเบียนภายนอก"), String(company.notBlacklisted))
    }
  })
  const automatic = rows.filter((row) => row.autoCheckable)
  // Eligibility here means passing every automated criterion, never final bid approval.
  const eligible = company !== null && automatic.length > 0 && automatic.every((row) => row.status === "passed") && !rows.some((row) => row.status === "insufficient-data")
  const status: QualificationStatus = rows.some((row) => row.status === "failed") ? "failed"
    : !company || !rows.length || rows.some((row) => row.status === "insufficient-data") ? "insufficient-data"
    : rows.some((row) => row.status === "manual-review") ? "manual-review" : "passed"
  return { profileSetup: company !== null, eligible, status, requiresManualReview: rows.some((row) => row.status === "manual-review"), evaluatedAt: now.toISOString(), rows }
}
