"use server"

import type { CompanySetupProfile } from "@/types/company-setup"

let savedProfile: CompanySetupProfile | null = null

export async function getCompanySetupProfileAction() {
  return savedProfile
}

export async function saveCompanySetupProfileAction(
  profile: CompanySetupProfile
) {
  savedProfile = profile
  console.log("Action clicked: Save company profile", {
    companyNameEnglish: profile.companyNameEnglish,
    taxId: profile.taxId,
  })
  return { ok: true as const, profile }
}
