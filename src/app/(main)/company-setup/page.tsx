import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getCompanySetupProfileAction } from "@/actions/company-setup"
import { CompanySetupWizard } from "@/components/company-setup/company-setup-wizard"
import { isCompanyProfileComplete } from "@/lib/company-setup"

export const metadata: Metadata = {
  title: "Company Setup | TOR Match",
}

type CompanySetupPageProps = {
  searchParams: Promise<{ edit?: string }>
}

export default async function CompanySetupPage({
  searchParams,
}: CompanySetupPageProps) {
  const profile = await getCompanySetupProfileAction()
  const params = await searchParams
  const isEdit = params.edit === "1" || params.edit === "true"
  const isComplete = isCompanyProfileComplete(profile)

  if (isComplete && !isEdit) {
    redirect("/company-profile")
  }

  return (
    <div className="min-h-0 flex-1 bg-background">
      <CompanySetupWizard
        initialProfile={profile}
        mode={isEdit ? "edit" : "setup"}
      />
    </div>
  )
}
