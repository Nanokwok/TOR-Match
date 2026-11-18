import type { Metadata } from "next"

import { ChangePasswordView } from "@/components/settings/change-password-view"

export const metadata: Metadata = {
  title: "Change password | TOR Match",
}

export default function ChangePasswordPage() {
  return (
    <div className="min-h-0 flex-1 bg-background">
      <ChangePasswordView />
    </div>
  )
}
