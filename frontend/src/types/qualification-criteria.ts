import type {
  CertificationId,
  CompanySize,
  EgPRegistrationStatus,
  SpecializationId,
} from "@/types/company-setup"

export type NumericOperator = "<" | "<=" | "=" | ">=" | ">"

export type QualificationCriteria =
  | { type: "manual" }
  | { type: "registered-capital"; op: NumericOperator; amountThb: number }
  | { type: "past-contract"; op: NumericOperator; amountThb: number }
  | {
    type: "certification"
    mode: "any" | "all"
    ids: CertificationId[]
    customIds?: string[]
  }
  | {
    type: "egp-registered"
    requiredStatus: EgPRegistrationStatus
  }
  | { type: "not-blacklisted" }
  | {
    type: "company-size"
    op: "=" | ">="
    size: CompanySize
  }
  | {
    type: "specialization"
    mode: "any" | "all"
    ids: SpecializationId[]
  }

/**
 * Mirrors qualificationCriteriaSchema in backend/src/validation/qualification.ts —
 * the actual shape the matching engine evaluates against a saved company
 * profile. Narrower than {@link QualificationCriteria}: no company-size or
 * specialization types, and the numeric types are minimum-only (no operator
 * choice). Defined separately rather than shared because the two live on
 * opposite sides of the frontend/backend boundary; see toBackendCriteria for
 * how one maps down to the other.
 */
export type BackendQualificationCriteria =
  | { type: "min-registered-capital"; minAmountThb: number }
  | { type: "min-past-contract"; minAmountThb: number }
  | { type: "certification"; certificationIds: string[]; mode: "any" | "all" }
  | { type: "egp-registered" }
  | { type: "not-blacklisted" }
  | { type: "manual" }
