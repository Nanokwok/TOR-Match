import { Suspense } from "react"
import type { Metadata } from "next"

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = {
  title: "Forgot Password | TOR Match",
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-full flex-1" />}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
