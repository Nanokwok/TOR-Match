import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getCompanySetupProfileAction } from "@/actions/company-setup"
import { CompanyProfileView } from "@/components/company-setup/company-profile-view"
import { isCompanyProfileComplete } from "@/lib/company-setup"

export const metadata: Metadata = {
  title: "Company Profile | TOR Match",
}

export default async function CompanyProfilePage() {
  const profile = await getCompanySetupProfileAction()

  if (!isCompanyProfileComplete(profile)) {
    redirect("/company-setup")
  }

  return (
    <div className="min-h-0 flex-1 bg-background">
      <CompanyProfileView profile={profile} />
    </div>
  )
}
