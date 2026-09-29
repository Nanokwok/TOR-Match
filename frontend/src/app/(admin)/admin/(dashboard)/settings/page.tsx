import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAdminSystemSettingsAction } from "@/actions/admin-settings"
import { SystemSettingsView } from "@/components/admin/system-settings-view"
import { AdminApiAuthError } from "@/lib/admin-api"
import { defaultAdminSystemSettings } from "@/server/db/mock/admin-settings"

export const metadata: Metadata = {
  title: "System Settings | TOR Match Admin",
  robots: { index: false, follow: false },
}

export default async function AdminSettingsPage() {
  let settings = defaultAdminSystemSettings

  try {
    settings = await getAdminSystemSettingsAction()
  } catch (err) {
    if (err instanceof AdminApiAuthError) {
      redirect("/admin/login")
    }
  }

  return (
    <SystemSettingsView initialSettings={settings} />
  )
}

