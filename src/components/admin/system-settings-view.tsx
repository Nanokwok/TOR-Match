"use client"

import { useState, type ReactNode } from "react"

import type { AdminSystemSettings } from "@/server/db/mock/admin-settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type SystemSettingsViewProps = {
  initialSettings: AdminSystemSettings
}

export function SystemSettingsView({
  initialSettings,
}: SystemSettingsViewProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [message, setMessage] = useState<string | null>(null)

  function update<K extends keyof AdminSystemSettings>(
    key: K,
    value: AdminSystemSettings[K]
  ) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  function handleSave() {
    setMessage("Settings saved (frontend only).")
  }

  function handleReset() {
    setSettings(initialSettings)
    setMessage("Settings reset to defaults.")
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            System Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure scraper, OCR, review automation, and admin security.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scraper & OCR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <SettingRow
              title="Enable scraper"
              description="Run scheduled scrapes against source portals."
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
                <Label htmlFor="scraper-interval">Scrape interval (min)</Label>
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
                <Label htmlFor="ocr-workers">OCR workers</Label>
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
            <CardTitle className="text-base">TOR Review Automation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <SettingRow
              title="Auto-approve high confidence"
              description="Publish TORs automatically when AI confidence is high enough."
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
                Auto-approve threshold (%)
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
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <SettingRow
              title="OCR failure alerts"
              description="Email admins when OCR jobs fail."
            >
              <Switch
                checked={settings.notifyOnOcrFailure}
                onCheckedChange={(checked) =>
                  update("notifyOnOcrFailure", checked)
                }
              />
            </SettingRow>
            <SettingRow
              title="New company signup alerts"
              description="Notify when a company account needs approval."
            >
              <Switch
                checked={settings.notifyOnNewSignup}
                onCheckedChange={(checked) =>
                  update("notifyOnNewSignup", checked)
                }
              />
            </SettingRow>
            <div className="space-y-2">
              <Label htmlFor="support-email">Support email</Label>
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
            <CardTitle className="text-base">Security & Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <SettingRow
              title="Maintenance mode"
              description="Block non-admin access to the public product UI."
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
                Admin session timeout (min)
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
                Live sessions currently use a 30-minute inactivity timeout.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
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
