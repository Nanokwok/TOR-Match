import type {
  CertificationId,
  CompanySetupProfile,
  CompanySetupStepId,
  PastProject,
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

/** Required fields that must be filled before the company profile is usable. */
export function isCompanyProfileComplete(
  profile: CompanySetupProfile | null | undefined
): profile is CompanySetupProfile {
  if (!profile) return false
  if (!profile.companyNameThai.trim()) return false
  if (!profile.companySize) return false
  if (!profile.contactEmail.trim()) return false
  if (!profile.registeredCapitalThb.trim()) return false
  if (!profile.notBlacklisted) return false
  if (profile.specializations.length === 0) return false

  const incompleteCert = profile.certifications.find(
    (item) =>
      item.selected &&
      (!item.certificateNumber.trim() || !item.expirationDate.trim())
  )
  if (incompleteCert) return false

  return true
}

export function getCompanySizeLabel(value: CompanySetupProfile["companySize"]) {
  return (
    COMPANY_SIZE_OPTIONS.find((option) => option.value === value)?.label ??
    value ??
    "—"
  )
}

export function getEgPStatusLabel(value: CompanySetupProfile["egpStatus"]) {
  switch (value) {
    case "registered":
      return "Registered on e-GP"
    case "in-progress":
      return "Registration in progress"
    case "not-registered":
      return "Not registered"
    default:
      return "—"
  }
}

export function getClientSectorLabel(value: PastProject["clientSector"]) {
  return (
    CLIENT_SECTOR_OPTIONS.find((option) => option.value === value)?.label ??
    value ??
    "—"
  )
}

export function getSpecializationLabel(id: SpecializationId) {
  return (
    SPECIALIZATION_OPTIONS.find((option) => option.id === id)?.label ?? id
  )
}

export function getCertificationLabel(id: CertificationId) {
  return CERTIFICATION_OPTIONS.find((option) => option.id === id)?.label ?? id
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
