import {
  CERTIFICATION_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  SPECIALIZATION_OPTIONS,
} from "@/lib/company-setup"
import type { QualificationCriteria, NumericOperator } from "@/types/qualification-criteria"
import type { CertificationId, CompanySize, SpecializationId } from "@/types/company-setup"

export type CriteriaFieldType =
  | "number"         // numeric comparison with operator
  | "enum-single"    // single-value enum selection
  | "enum-multi"     // multi-value enum selection with AND/OR
  | "boolean"        // no extra config — just a flag check

export type AutoCriteriaType =
  | "registered-capital"
  | "past-contract"
  | "certification"
  | "egp-registered"
  | "not-blacklisted"
  | "company-size"
  | "specialization"

export type CriteriaFieldOption = {
  id: AutoCriteriaType
  label: string
  companySection: string
  fieldType: CriteriaFieldType
  iconName: "banknote" | "trending-up" | "award" | "building-2" | "shield-check" | "users" | "layers"
}

export const CRITERIA_FIELD_OPTIONS: CriteriaFieldOption[] = [
  {
    id: "registered-capital",
    label: "Registered Capital",
    companySection: "Financial & Legal",
    fieldType: "number",
    iconName: "banknote",
  },
  {
    id: "past-contract",
    label: "Past Contract Value",
    companySection: "Past Performance",
    fieldType: "number",
    iconName: "trending-up",
  },
  {
    id: "certification",
    label: "Certifications",
    companySection: "Certifications & Standards",
    fieldType: "enum-multi",
    iconName: "award",
  },
  {
    id: "egp-registered",
    label: "e-GP Registration Status",
    companySection: "Financial & Legal",
    fieldType: "enum-single",
    iconName: "building-2",
  },
  {
    id: "not-blacklisted",
    label: "Not Blacklisted / Legal Clearance",
    companySection: "Financial & Legal",
    fieldType: "boolean",
    iconName: "shield-check",
  },
  {
    id: "company-size",
    label: "Company Size",
    companySection: "General Info",
    fieldType: "enum-single",
    iconName: "users",
  },
  {
    id: "specialization",
    label: "Specialization",
    companySection: "Capabilities",
    fieldType: "enum-multi",
    iconName: "layers",
  },
]

export function defaultCriteriaForType(type: QualificationCriteria["type"]): QualificationCriteria {
  switch (type) {
    case "registered-capital":
      return { type: "registered-capital", op: ">=", amountThb: 0 }
    case "past-contract":
      return { type: "past-contract", op: ">=", amountThb: 0 }
    case "certification":
      return { type: "certification", mode: "any", ids: [], customIds: [] }
    case "egp-registered":
      return { type: "egp-registered", requiredStatus: "registered" }
    case "not-blacklisted":
      return { type: "not-blacklisted" }
    case "company-size":
      return { type: "company-size", op: ">=", size: "small" }
    case "specialization":
      return { type: "specialization", mode: "any", ids: [] }
    case "manual":
    default:
      return { type: "registered-capital", op: ">=", amountThb: 0 }
  }
}


export function criteriaLabel(criteria: QualificationCriteria | undefined): string {
  if (!criteria) return "Not configured"

  switch (criteria.type) {
    case "manual":
      return "Manual check — no automated rule"

    case "registered-capital":
    case "past-contract": {
      const fieldLabel =
        criteria.type === "registered-capital" ? "Registered Capital" : "Past Contract"
      const formatted = criteria.amountThb.toLocaleString("en-US")
      return `${fieldLabel} ${criteria.op} ${formatted} THB`
    }

    case "certification": {
      const modeWord = criteria.mode === "any" ? "any of" : "all of"
      const knownLabels = criteria.ids.map(
        (id) => CERTIFICATION_OPTIONS.find((o) => o.id === id)?.label ?? id
      )
      const allLabels = [...knownLabels, ...(criteria.customIds ?? [])]
      if (allLabels.length === 0) return "Certification — none selected"
      return `Certification — ${modeWord}: ${allLabels.join(", ")}`
    }

    case "egp-registered": {
      const statusMap: Record<string, string> = {
        registered: "Registered on e-GP",
        "in-progress": "Registration in progress",
        "not-registered": "Not registered",
      }
      return `e-GP status = ${statusMap[criteria.requiredStatus] ?? criteria.requiredStatus}`
    }

    case "not-blacklisted":
      return "Not blacklisted"

    case "company-size": {
      const sizeLabel =
        COMPANY_SIZE_OPTIONS.find((o) => o.value === criteria.size)?.label ?? criteria.size
      return `Company size ${criteria.op} ${sizeLabel}`
    }

    case "specialization": {
      const modeWord = criteria.mode === "any" ? "any of" : "all of"
      const labels = criteria.ids.map(
        (id) => SPECIALIZATION_OPTIONS.find((o) => o.id === id)?.label ?? id
      )
      if (labels.length === 0) return "Specialization — none selected"
      return `Specialization — ${modeWord}: ${labels.join(", ")}`
    }

    default:
      return "Unknown criteria"
  }
}

export const NUMERIC_OPERATORS: { value: NumericOperator; label: string }[] = [
  { value: "<", label: "< (less than)" },
  { value: "<=", label: "≤ (at most)" },
  { value: "=", label: "= (exactly)" },
  { value: ">=", label: "≥ (at least)" },
  { value: ">", label: "> (more than)" },
]

export const SIZE_OPERATORS: { value: "=" | ">="; label: string }[] = [
  { value: "=", label: "= (exactly)" },
  { value: ">=", label: "≥ (at least)" },
]

export type { CertificationId, CompanySize, SpecializationId }
