import type { Metadata } from "next"

import { PrivacyView } from "@/components/privacy/privacy-view"

export const metadata: Metadata = {
  title: "Privacy Policy & PDPA SOP | TOR Match",
  description:
    "Privacy Policy, Personal Data Protection Act (PDPA) compliance details, and standard operating procedures (SOP) for data deletion and access requests.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-0 flex-1 bg-background">
      <PrivacyView />
    </div>
  )
}
