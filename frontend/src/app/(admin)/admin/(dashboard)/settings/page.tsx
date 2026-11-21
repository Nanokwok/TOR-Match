import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAdminSystemSettingsAction } from "@/actions/admin-settings"
import { SystemSettingsView } from "@/components/admin/system-settings-view"
import { AdminApiAuthError } from "@/lib/admin-api"
import type { AdminSystemSettings } from "@/types/admin-settings"

export const metadata: Metadata = {
  title: "System Settings | TOR Match Admin",
  robots: { index: false, follow: false },
}

export default async function AdminSettingsPage() {
  let settings: AdminSystemSettings | null = null

  try {
    settings = await getAdminSystemSettingsAction()
  } catch (err) {
    if (err instanceof AdminApiAuthError) {
      redirect("/admin/login")
    }
  }

  // null means the stored settings could not be read; the view says so rather than showing defaults.
  return <SystemSettingsView initialSettings={settings} />
}
