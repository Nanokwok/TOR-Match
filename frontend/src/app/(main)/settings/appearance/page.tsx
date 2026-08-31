import type { Metadata } from "next"

import { AppearanceSettingsView } from "@/components/settings/appearance-settings-view"

export const metadata: Metadata = {
  title: "Appearance & Display | TOR Match",
}

export default function AppearanceSettingsPage() {
  return (
    <div className="min-h-0 flex-1 bg-background">
      <AppearanceSettingsView />
    </div>
  )
}
