import { getNotificationSettingsAction } from "@/actions/notification-settings"
import { NotificationSettingsView } from "@/components/settings/notification-settings-view"

export default async function NotificationSettingsPage() {
  const initialSettings = await getNotificationSettingsAction()

  return (
    <div className="min-h-0 flex-1 bg-background">
      <NotificationSettingsView initialSettings={initialSettings} />
    </div>
  )
}
