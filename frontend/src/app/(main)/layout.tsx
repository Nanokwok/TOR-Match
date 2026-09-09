import type { ReactNode } from "react"

import { getCompanySetupProfileAction } from "@/actions/company-setup"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"

export default async function MainLayout({ children }: { children: ReactNode }) {
  const profile = await getCompanySetupProfileAction()

  const account = profile
    ? {
        companyNameThai: profile.companyNameThai,
        companyNameEnglish: profile.companyNameEnglish,
        // Prefer session email once exposed to the layout; contact email is interim.
        email: profile.contactEmail,
      }
    : undefined

  return (
    <>
      <Header account={account} />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <Footer />
    </>
  )
}
