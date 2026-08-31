export type CompanySize =
  | "micro"
  | "small"
  | "medium"
  | "large"

export type EgPRegistrationStatus =
  | "registered"
  | "in-progress"
  | "not-registered"

export type CertificationId =
  | "iso-29110"
  | "iso-27001"
  | "cmmi-2"
  | "iso-9001"

export type ClientSector =
  | "government"
  | "state-enterprise"
  | "private"
  | "ngo"

export type SpecializationId =
  | "software-development"
  | "system-maintenance"
  | "data-ai"
  | "mobile-app"

export type CertificationEntry = {
  id: CertificationId
  selected: boolean
  certificateNumber: string
  expirationDate: string
}

export type PastProject = {
  id: string
  title: string
  clientSector: ClientSector | ""
  contractValueThb: string
  completionYear: string
}

export type CompanySetupProfile = {
  companyNameThai: string
  companyNameEnglish: string
  taxId: string
  companySize: CompanySize | ""
  contactEmail: string
  phone: string
  registeredCapitalThb: string
  egpStatus: EgPRegistrationStatus
  notBlacklisted: boolean
  certifications: CertificationEntry[]
  pastProjects: PastProject[]
  techStack: string[]
  specializations: SpecializationId[]
}

export type CompanySetupStepId =
  | "general"
  | "financial"
  | "certifications"
  | "past-performance"
  | "capabilities"
