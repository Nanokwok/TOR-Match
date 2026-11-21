import { Suspense } from "react"
import type { Metadata } from "next"

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = {
  title: "Forgot Password | TOR Match",
  // The emailed link carries a token in the address. Keep it out of the Referer
  // header of anything this page loads or links to.
  referrer: "no-referrer",
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-full flex-1" />}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
