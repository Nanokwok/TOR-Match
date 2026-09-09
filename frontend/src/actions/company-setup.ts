"use server"

import { cookies } from "next/headers"

import { ApiRequestError, apiFetch } from "@/lib/api-client"
import { required } from "@/lib/env"
import { CERTIFICATION_OPTIONS } from "@/lib/company-setup"
import type { CertificationEntry, CompanySetupProfile } from "@/types/company-setup"

const AUTH_COOKIE_NAME = required("AUTH_COOKIE_NAME")

// Shape returned by the backend (backend/src/models/Company.model.ts serialized
// to JSON) — a superset of CompanySetupProfile (adds Mongo's _id/timestamps,
// and pastProjects items carry a Mongo-generated _id instead of a client id).
type BackendPastProject = {
  _id?: string
  title: string
  clientSector: string
  contractValueThb: string
  completionYear: string
}

type BackendCompany = {
  companyNameThai: string
  companyNameEnglish: string
  taxId: string
  companySize: string
  contactEmail: string
  phone: string
  registeredCapitalThb: string
  egpStatus: string
  notBlacklisted: boolean
  certifications: CompanySetupProfile["certifications"]
  pastProjects: BackendPastProject[]
  techStack: string[]
  specializations: string[]
}

// The wizard assumes profile.certifications has exactly one entry per
// CERTIFICATION_OPTIONS id (see CertificationsStep in company-setup-wizard.tsx).
// createDefaultCompanySetupProfile() and the demo-fill both uphold that by
// construction, but a document saved directly against the API (bypassing the
// wizard) might not — this is the one boundary where that data enters the
// app, so backfill any missing id here rather than at every read site.
function normalizeCertifications(saved: CertificationEntry[]): CertificationEntry[] {
  return CERTIFICATION_OPTIONS.map((option) => {
    const entry = saved.find((item) => item.id === option.id)
    return (
      entry ?? {
        id: option.id,
        selected: false,
        certificateNumber: "",
        expirationDate: "",
      }
    )
  })
}

function fromBackend(company: BackendCompany): CompanySetupProfile {
  return {
    companyNameThai: company.companyNameThai,
    companyNameEnglish: company.companyNameEnglish,
    taxId: company.taxId,
    companySize: company.companySize as CompanySetupProfile["companySize"],
    contactEmail: company.contactEmail,
    phone: company.phone,
    registeredCapitalThb: company.registeredCapitalThb,
    egpStatus: company.egpStatus as CompanySetupProfile["egpStatus"],
    notBlacklisted: company.notBlacklisted,
    certifications: normalizeCertifications(company.certifications),
    pastProjects: company.pastProjects.map((project, index) => ({
      id: project._id ?? `project-${index}`,
      title: project.title,
      clientSector: project.clientSector as CompanySetupProfile["pastProjects"][number]["clientSector"],
      contractValueThb: project.contractValueThb,
      completionYear: project.completionYear,
    })),
    techStack: company.techStack,
    specializations: company.specializations as CompanySetupProfile["specializations"],
  }
}

function toBackend(profile: CompanySetupProfile) {
  return {
    ...profile,
    // Backend requires a non-empty title (backend/src/models/Company.model.ts);
    // the wizard's past-performance step is optional and ships a blank row by
    // default, so drop rows the user never filled in rather than rejecting the save.
    pastProjects: profile.pastProjects
      .filter((project) => project.title.trim())
      .map(({ id: _id, ...project }) => project),
  }
}

async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null
}

export async function getCompanySetupProfileAction(): Promise<CompanySetupProfile | null> {
  const token = await getAuthToken()
  if (!token) return null

  try {
    const company = await apiFetch<BackendCompany | null>("/companies/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
    return company ? fromBackend(company) : null
  } catch (error) {
    console.error("getCompanySetupProfileAction failed", error)
    return null
  }
}

export type SaveCompanySetupResult =
  | { ok: true; profile: CompanySetupProfile }
  | { ok: false; error: string }

export async function saveCompanySetupProfileAction(
  profile: CompanySetupProfile
): Promise<SaveCompanySetupResult> {
  const token = await getAuthToken()
  if (!token) {
    return { ok: false, error: "You must be signed in to save a company profile." }
  }

  try {
    const company = await apiFetch<BackendCompany>("/companies/me", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(toBackend(profile)),
    })
    return { ok: true, profile: fromBackend(company) }
  } catch (error) {
    const message = error instanceof ApiRequestError ? error.message : "Something went wrong. Please try again."
    console.error("saveCompanySetupProfileAction failed", error)
    return { ok: false, error: message }
  }
}
