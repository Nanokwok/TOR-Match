"use server"

import { revalidatePath } from "next/cache"

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

  // Header lives in the main layout — refresh any route under it.
  revalidatePath("/", "layout")

  return { ok: true as const, profile }
}
