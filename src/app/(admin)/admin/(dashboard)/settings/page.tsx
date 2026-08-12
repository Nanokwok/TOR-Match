import type { Metadata } from "next"

import { SystemSettingsView } from "@/components/admin/system-settings-view"
import { defaultAdminSystemSettings } from "@/server/db/mock/admin-settings"

export const metadata: Metadata = {
  title: "System Settings | TOR Match Admin",
  robots: { index: false, follow: false },
}

export default function AdminSettingsPage() {
  return (
    <SystemSettingsView initialSettings={defaultAdminSystemSettings} />
  )
}
