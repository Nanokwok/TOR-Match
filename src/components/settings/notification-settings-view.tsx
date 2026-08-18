"use client"

import { useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, Bell, Mail } from "lucide-react"

import { saveNotificationSettingsAction } from "@/actions/notification-settings"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  cloneNotificationSettings,
  DAILY_DIGEST_TIMES,
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_EVENT_IDS,
  NOTIFICATION_EVENTS_WITH_DESCRIPTION,
  WEEKLY_DIGEST_DAYS,
} from "@/lib/notification-settings"
import { cn } from "@/lib/utils"
import type {
  DigestDeliveryTime,
  NotificationChannel,
  NotificationEventId,
  NotificationSettings,
  WeeklyDigestDay,
} from "@/types/notification-settings"

type NotificationSettingsViewProps = {
  initialSettings: NotificationSettings
}

export function NotificationSettingsView({
  initialSettings,
}: NotificationSettingsViewProps) {
  const { t } = useLocale()
  const [settings, setSettings] = useState(() =>
    cloneNotificationSettings(initialSettings)
  )
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    cloneNotificationSettings(initialSettings)
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isSaving, startSave] = useTransition()

  const isDirty =
    JSON.stringify(settings) !== JSON.stringify(savedSnapshot)

  function eventLabel(eventId: NotificationEventId) {
    return t(`notificationSettings.events.${eventId}.label`)
  }

  function eventDescription(eventId: NotificationEventId) {
    if (!NOTIFICATION_EVENTS_WITH_DESCRIPTION.has(eventId)) return null
    return t(`notificationSettings.events.${eventId}.description`)
  }

  function digestTimeLabel(value: DigestDeliveryTime) {
    return t(`notificationSettings.digestTimes.${value}`)
  }

  function digestDayLabel(value: WeeklyDigestDay) {
    return t(`notificationSettings.digestDays.${value}`)
  }

  function updateSettings(
    updater: (current: NotificationSettings) => NotificationSettings
  ) {
    setSettings((current) => updater(current))
    setStatusMessage(null)
  }

  function toggleMaster(channel: "inAppEnabled" | "emailEnabled", value: boolean) {
    updateSettings((current) => ({ ...current, [channel]: value }))
  }

  function toggleEvent(
    eventId: NotificationEventId,
    channel: NotificationChannel,
    value: boolean
  ) {
    updateSettings((current) => ({
      ...current,
      events: {
        ...current.events,
        [eventId]: {
          ...current.events[eventId],
          [channel]: value,
        },
      },
    }))
  }

  function handleReset() {
    updateSettings(() => cloneNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS))
    setStatusMessage(t("notificationSettings.restoredDefaults"))
  }

  function handleSave() {
    startSave(async () => {
      const result = await saveNotificationSettingsAction(settings)
      if (result.ok) {
        setSavedSnapshot(cloneNotificationSettings(result.settings))
        setSettings(cloneNotificationSettings(result.settings))
        setStatusMessage(t("notificationSettings.preferencesSaved"))
      }
    })
  }

  const weeklyDayLabel = digestDayLabel(settings.weeklyDigestDay)
  const weeklyTimeLabel = digestTimeLabel(settings.weeklyDigestTime)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="space-y-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("notificationSettings.backToSettings")}
        </Link>

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {t("notificationSettings.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("notificationSettings.subtitle")}
          </p>
        </header>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <MasterSwitchCard
          icon={<Bell className="size-4" />}
          title={t("notificationSettings.inAppTitle")}
          description={t("notificationSettings.inAppDesc")}
          checked={settings.inAppEnabled}
          onCheckedChange={(checked) => toggleMaster("inAppEnabled", checked)}
        />
        <MasterSwitchCard
          icon={<Mail className="size-4" />}
          title={t("notificationSettings.emailTitle")}
          description={t("notificationSettings.emailRecipient", {
            email: settings.emailRecipient,
          })}
          checked={settings.emailEnabled}
          onCheckedChange={(checked) => toggleMaster("emailEnabled", checked)}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {t("notificationSettings.matrixTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("notificationSettings.matrixSubtitle")}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/80 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-5 py-3 font-medium">
                  {t("notificationSettings.eventCategory")}
                </th>
                <th className="w-24 px-3 py-3 text-center font-medium">
                  {t("notificationSettings.inAppColumn")}
                </th>
                <th className="w-24 px-3 py-3 text-center font-medium">
                  {t("notificationSettings.emailColumn")}
                </th>
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_EVENT_IDS.map((eventId) => {
                const preference = settings.events[eventId]
                const label = eventLabel(eventId)
                const description = eventDescription(eventId)

                return (
                  <tr
                    key={eventId}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-foreground">{label}</div>
                      {description ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={preference.inApp}
                          disabled={!settings.inAppEnabled}
                          onCheckedChange={(checked) =>
                            toggleEvent(eventId, "inApp", checked === true)
                          }
                          aria-label={t("notificationSettings.ariaInApp", {
                            event: label,
                          })}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={preference.email}
                          disabled={!settings.emailEnabled}
                          onCheckedChange={(checked) =>
                            toggleEvent(eventId, "email", checked === true)
                          }
                          aria-label={t("notificationSettings.ariaEmail", {
                            event: label,
                          })}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t("notificationSettings.digestTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("notificationSettings.digestSubtitle")}
          </p>
        </div>

        <div className="space-y-3">
          <DigestCard
            title={t("notificationSettings.instantTitle")}
            description={t("notificationSettings.instantDesc")}
            enabled={settings.instantEmailAlerts}
            disabled={!settings.emailEnabled}
            onEnabledChange={(checked) =>
              updateSettings((current) => ({
                ...current,
                instantEmailAlerts: checked,
              }))
            }
          />

          <DigestCard
            title={t("notificationSettings.dailyTitle")}
            description={t("notificationSettings.dailyDesc")}
            enabled={settings.dailyDigestEnabled}
            disabled={!settings.emailEnabled}
            onEnabledChange={(checked) =>
              updateSettings((current) => ({
                ...current,
                dailyDigestEnabled: checked,
              }))
            }
          >
            <div className="space-y-1.5">
              <Label htmlFor="daily-digest-time">
                {t("notificationSettings.deliveryTime")}
              </Label>
              <Select
                value={settings.dailyDigestTime}
                disabled={!settings.emailEnabled || !settings.dailyDigestEnabled}
                onValueChange={(value) => {
                  if (!value) return
                  updateSettings((current) => ({
                    ...current,
                    dailyDigestTime: value as DigestDeliveryTime,
                  }))
                }}
              >
                <SelectTrigger id="daily-digest-time" className="h-9 w-full max-w-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAILY_DIGEST_TIMES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {digestTimeLabel(option.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DigestCard>

          <DigestCard
            title={t("notificationSettings.weeklyTitle")}
            description={t("notificationSettings.weeklyDesc")}
            enabled={settings.weeklyDigestEnabled}
            disabled={!settings.emailEnabled}
            onEnabledChange={(checked) =>
              updateSettings((current) => ({
                ...current,
                weeklyDigestEnabled: checked,
              }))
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="weekly-digest-day">
                  {t("notificationSettings.deliveryDay")}
                </Label>
                <Select
                  value={settings.weeklyDigestDay}
                  disabled={
                    !settings.emailEnabled || !settings.weeklyDigestEnabled
                  }
                  onValueChange={(value) => {
                    if (!value) return
                    updateSettings((current) => ({
                      ...current,
                      weeklyDigestDay: value as WeeklyDigestDay,
                    }))
                  }}
                >
                  <SelectTrigger
                    id="weekly-digest-day"
                    className="h-9 w-full bg-background"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKLY_DIGEST_DAYS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {digestDayLabel(option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weekly-digest-time">
                  {t("notificationSettings.deliveryTime")}
                </Label>
                <Select
                  value={settings.weeklyDigestTime}
                  disabled={
                    !settings.emailEnabled || !settings.weeklyDigestEnabled
                  }
                  onValueChange={(value) => {
                    if (!value) return
                    updateSettings((current) => ({
                      ...current,
                      weeklyDigestTime: value as DigestDeliveryTime,
                    }))
                  }}
                >
                  <SelectTrigger
                    id="weekly-digest-time"
                    className="h-9 w-full bg-background"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAILY_DIGEST_TIMES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {digestTimeLabel(option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("notificationSettings.weeklySummary", {
                day: weeklyDayLabel,
                time: weeklyTimeLabel,
              })}
            </p>
          </DigestCard>
        </div>
      </section>

      <footer className="sticky bottom-0 -mx-6 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {statusMessage ??
            (isDirty
              ? t("notificationSettings.unsavedChanges")
              : t("notificationSettings.allSaved"))}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={isSaving}
          >
            {t("notificationSettings.resetDefaults")}
          </Button>
          <Button
            type="button"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving
              ? t("notificationSettings.saving")
              : t("notificationSettings.savePreferences")}
          </Button>
        </div>
      </footer>
    </div>
  )
}

function MasterSwitchCard({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon: ReactNode
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </span>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-checked:bg-primary"
        aria-label={title}
      />
    </div>
  )
}

function DigestCard({
  title,
  description,
  enabled,
  disabled,
  onEnabledChange,
  children,
}: {
  title: string
  description: string
  enabled: boolean
  disabled?: boolean
  onEnabledChange: (checked: boolean) => void
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        disabled && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch
          checked={enabled}
          disabled={disabled}
          onCheckedChange={onEnabledChange}
          className="data-checked:bg-primary"
          aria-label={title}
        />
      </div>
      {children ? (
        <div
          className={cn(
            "mt-4 space-y-3 border-t border-border pt-4",
            (!enabled || disabled) && "pointer-events-none opacity-50"
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
