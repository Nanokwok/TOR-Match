import type { Metadata } from "next"

import { getCompanySetupProfileAction } from "@/actions/company-setup"
import { CompanySetupWizard } from "@/components/company-setup/company-setup-wizard"

export const metadata: Metadata = {
  title: "Company Setup | TOR Match",
}

export default async function CompanySetupPage() {
  const initialProfile = await getCompanySetupProfileAction()

  return (
    <div className="min-h-0 flex-1 bg-white">
      <CompanySetupWizard initialProfile={initialProfile} />
    </div>
  )
}
