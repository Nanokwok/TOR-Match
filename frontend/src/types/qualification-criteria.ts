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
