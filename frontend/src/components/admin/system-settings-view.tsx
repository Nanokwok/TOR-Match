"use client"

import { useState, type ReactNode } from "react"

import {
  resetAdminSystemSettingsAction,
  updateAdminSystemSettingsAction,
} from "@/actions/admin-settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useLocale } from "@/components/i18n/locale-provider"
import type { AdminSystemSettings } from "@/server/db/mock/admin-settings"

type SystemSettingsViewProps = {
  initialSettings: AdminSystemSettings
}

export function SystemSettingsView({
  initialSettings,
}: SystemSettingsViewProps) {
  const { t } = useLocale()
  const [settings, setSettings] = useState(initialSettings)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  function update<K extends keyof AdminSystemSettings>(
    key: K,
    value: AdminSystemSettings[K]
  ) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  async function handleSave() {
    setIsSaving(true)
    setMessage(null)
    const result = await updateAdminSystemSettingsAction(settings)
    if (result.ok) {
      setSettings(result.settings)
      setMessage(t("admin.systemSettings.settingsSaved"))
      setIsError(false)
    } else {
      setMessage(result.error)
      setIsError(true)
    }
    setIsSaving(false)
  }

  async function handleReset() {
    setIsResetting(true)
    setMessage(null)
    const result = await resetAdminSystemSettingsAction()
    if (result.ok) {
      setSettings(result.settings)
      setMessage(t("admin.systemSettings.settingsReset"))
      setIsError(false)
    } else {
      setMessage(result.error)
      setIsError(true)
    }
    setIsResetting(false)
  }

  return (
    <ScrollArea className="flex-1" viewportClassName="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("admin.systemSettings.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("admin.systemSettings.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving || isResetting}
          >
            {isResetting ? t("admin.systemSettings.resetting") : t("admin.systemSettings.reset")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isResetting}
          >
            {isSaving ? t("admin.systemSettings.saving") : t("admin.systemSettings.saveChanges")}
          </Button>
        </div>
      </div>

      {message ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            isError
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-muted/40 text-muted-foreground"
          )}
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.systemSettings.cards.apiIngest")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <SettingRow
              title={t("admin.systemSettings.fields.enableAutomatedIngest")}
              description={t("admin.systemSettings.fields.enableAutomatedIngestDesc")}
            >
              <Switch
                checked={settings.scraperEnabled}
                onCheckedChange={(checked) =>
                  update("scraperEnabled", checked)
                }
              />
            </SettingRow>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scraper-interval">{t("admin.systemSettings.fields.ingestInterval")}</Label>
                <Input
                  id="scraper-interval"
                  type="number"
                  min={5}
                  value={settings.scraperIntervalMinutes}
                  onChange={(event) =>
                    update(
                      "scraperIntervalMinutes",
                      Number(event.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ocr-workers">{t("admin.systemSettings.fields.ocrWorkers")}</Label>
                <Input
                  id="ocr-workers"
                  type="number"
                  min={1}
                  max={16}
                  value={settings.ocrWorkers}
                  onChange={(event) =>
                    update("ocrWorkers", Number(event.target.value) || 0)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.systemSettings.cards.torAutomation")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <SettingRow
              title={t("admin.systemSettings.fields.autoApproveHighConfidence")}
              description={t("admin.systemSettings.fields.autoApproveHighConfidenceDesc")}
            >
              <Switch
                checked={settings.autoApproveEnabled}
                onCheckedChange={(checked) =>
                  update("autoApproveEnabled", checked)
                }
              />
            </SettingRow>
            <div className="space-y-2">
              <Label htmlFor="auto-threshold">
                {t("admin.systemSettings.fields.autoApproveThreshold")}
              </Label>
              <Input
                id="auto-threshold"
                type="number"
                min={50}
                max={100}
                disabled={!settings.autoApproveEnabled}
                value={settings.autoApproveThreshold}
                onChange={(event) =>
                  update(
                    "autoApproveThreshold",
                    Number(event.target.value) || 0
                  )
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.systemSettings.cards.notifications")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <SettingRow
              title={t("admin.systemSettings.fields.ocrFailureAlerts")}
              description={t("admin.systemSettings.fields.ocrFailureAlertsDesc")}
            >
              <Switch
                checked={settings.notifyOnOcrFailure}
                onCheckedChange={(checked) =>
                  update("notifyOnOcrFailure", checked)
                }
              />
            </SettingRow>
            <SettingRow
              title={t("admin.systemSettings.fields.newCompanyAlerts")}
              description={t("admin.systemSettings.fields.newCompanyAlertsDesc")}
            >
              <Switch
                checked={settings.notifyOnNewSignup}
                onCheckedChange={(checked) =>
                  update("notifyOnNewSignup", checked)
                }
              />
            </SettingRow>
            <div className="space-y-2">
              <Label htmlFor="support-email">{t("admin.systemSettings.fields.supportEmail")}</Label>
              <Input
                id="support-email"
                type="email"
                value={settings.supportEmail}
                onChange={(event) => update("supportEmail", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.systemSettings.cards.security")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <SettingRow
              title={t("admin.systemSettings.fields.maintenanceMode")}
              description={t("admin.systemSettings.fields.maintenanceModeDesc")}
            >
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) =>
                  update("maintenanceMode", checked)
                }
              />
            </SettingRow>
            <div className="space-y-2">
              <Label htmlFor="session-minutes">
                {t("admin.systemSettings.fields.adminSessionTimeout")}
              </Label>
              <Input
                id="session-minutes"
                type="number"
                min={5}
                max={120}
                value={settings.adminSessionMinutes}
                onChange={(event) =>
                  update(
                    "adminSessionMinutes",
                    Number(event.target.value) || 0
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("admin.systemSettings.fields.sessionTimeoutHint")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}
