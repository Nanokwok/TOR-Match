import type {
  CertificationId,
  CompanySetupProfile,
  CompanySetupStepId,
  SpecializationId,
} from "@/types/company-setup"

export const COMPANY_SETUP_STEPS: {
  id: CompanySetupStepId
  label: string
  nextLabel: string
}[] = [
  {
    id: "general",
    label: "General Company Info",
    nextLabel: "Next: Financial & Legal",
  },
  {
    id: "financial",
    label: "Financial & Legal Eligibility",
    nextLabel: "Next: Certifications",
  },
  {
    id: "certifications",
    label: "Certifications & Standards",
    nextLabel: "Next: Past Performance",
  },
  {
    id: "past-performance",
    label: "Past Performance Contracts",
    nextLabel: "Next: Capabilities",
  },
  {
    id: "capabilities",
    label: "Capabilities",
    nextLabel: "Save Profile & Start Matching",
  },
]

export const COMPANY_SIZE_OPTIONS = [
  { value: "micro", label: "Micro (1–5 employees)" },
  { value: "small", label: "Small (6–50 employees)" },
  { value: "medium", label: "Medium (51–200 employees)" },
  { value: "large", label: "Large (200+ employees)" },
] as const

export const CERTIFICATION_OPTIONS: {
  id: CertificationId
  label: string
}[] = [
  { id: "iso-29110", label: "ISO/IEC 29110" },
  { id: "iso-27001", label: "ISO/IEC 27001" },
  { id: "cmmi-2", label: "CMMI Level 2+" },
  { id: "iso-9001", label: "ISO 9001" },
]

export const CLIENT_SECTOR_OPTIONS = [
  { value: "government", label: "Government" },
  { value: "state-enterprise", label: "State Enterprise" },
  { value: "private", label: "Private Sector" },
  { value: "ngo", label: "NGO / International Org" },
] as const

export const SPECIALIZATION_OPTIONS: {
  id: SpecializationId
  label: string
}[] = [
  { id: "software-development", label: "Software Development" },
  { id: "system-maintenance", label: "System Maintenance" },
  { id: "data-ai", label: "Data & AI" },
  { id: "mobile-app", label: "Mobile App" },
]

export const COMPLETION_YEAR_OPTIONS = Array.from({ length: 15 }, (_, index) => {
  const year = String(2026 - index)
  return { value: year, label: year }
})

export function createEmptyPastProject(
  id = `project-${Math.random().toString(36).slice(2, 9)}`
): CompanySetupProfile["pastProjects"][number] {
  return {
    id,
    title: "",
    clientSector: "",
    contractValueThb: "",
    completionYear: "",
  }
}

export function createDefaultCompanySetupProfile(): CompanySetupProfile {
  return {
    companyNameThai: "",
    companyNameEnglish: "",
    taxId: "",
    companySize: "",
    contactEmail: "",
    phone: "",
    registeredCapitalThb: "",
    egpStatus: "registered",
    notBlacklisted: false,
    certifications: CERTIFICATION_OPTIONS.map((option) => ({
      id: option.id,
      selected: option.id === "iso-29110",
      certificateNumber: "",
      expirationDate: "",
    })),
    pastProjects: [createEmptyPastProject("project-1")],
    techStack: ["OCR"],
    specializations: ["software-development"],
  }
}

export const STEP_DESCRIPTIONS: Record<CompanySetupStepId, string> = {
  general: "Fill in your basic corporate identification and contact details",
  financial: "Capital and regulatory status for automated deal-breaker checks.",
  certifications:
    "Select active technical standards to qualify for specialized TORs",
  "past-performance":
    "Add past projects to match minimum contract value requirements",
  capabilities:
    "Define your core technologies for automated search and tag matching",
}
