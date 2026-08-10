import type { Metadata } from "next"

import { SettingsHubView } from "@/components/settings/settings-hub-view"

export const metadata: Metadata = {
  title: "Settings | TOR Match",
}

export default function SettingsPage() {
  return (
    <div className="min-h-0 flex-1 bg-background">
      <SettingsHubView />
    </div>
  )
}
