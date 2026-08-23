import { redirect } from "next/navigation"

import { getCompanySetupProfileAction } from "@/actions/company-setup"
import { isCompanyProfileComplete } from "@/lib/company-setup"

export default async function EligibilityPage() {
  const profile = await getCompanySetupProfileAction()
  redirect(
    isCompanyProfileComplete(profile) ? "/company-profile" : "/company-setup"
  )
}
