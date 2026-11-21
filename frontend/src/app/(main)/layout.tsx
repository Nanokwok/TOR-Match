import type { ReactNode } from "react"

import { getCompanySetupProfileAction } from "@/actions/company-setup"
import { getNotificationsAction } from "@/actions/notifications"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import { SessionTimeoutListener } from "@/components/auth/session-timeout-listener"
import { getUserSession } from "@/lib/user-session"

export default async function MainLayout({ children }: { children: ReactNode }) {
  // The landing page lives in this layout too, so a visitor with no session
  // gets here: the header must offer to sign in, not to sign out.
  const isSignedIn = (await getUserSession()) !== null
  const [profile, initialNotifications] = isSignedIn
    ? await Promise.all([getCompanySetupProfileAction(), getNotificationsAction()])
    : [null, []]

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
      {/* A guest has no session to time out; it would "log them out" and send them to the login page. */}
      {isSignedIn ? <SessionTimeoutListener /> : null}
      <Header
        isSignedIn={isSignedIn}
        account={account}
        initialNotifications={initialNotifications}
      />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <Footer />
    </>
  )
}
