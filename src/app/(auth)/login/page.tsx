import type { Metadata } from "next"

import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Log In | TOR Match",
}

export default function LoginPage() {
  return <LoginForm />
}
