"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft } from "lucide-react"

import { useLocale } from "@/components/i18n/locale-provider"
import { useTheme } from "@/components/theme/theme-provider"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { ThemePreference } from "@/lib/theme"

export function AppearanceSettingsView() {
  const { t } = useLocale()
  const { theme, setTheme } = useTheme()
  const [showDeadlines, setShowDeadlines] = useState(true)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="space-y-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("appearanceSettings.backToSettings")}
        </Link>

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {t("appearanceSettings.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("appearanceSettings.subtitle")}
          </p>
        </header>
      </div>

      <section className="space-y-5 rounded-xl border border-border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="theme-preference" className="text-sm font-semibold">
            {t("appearanceSettings.themeLabel")}
          </Label>
          <Select
            value={theme}
            onValueChange={(value) => {
              if (!value) return
              setTheme(value as ThemePreference)
            }}
          >
            <SelectTrigger
              id="theme-preference"
              className="h-10 w-full data-[size=default]:h-10"
            >
              <SelectValue placeholder={t("appearanceSettings.themePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">
                {t("appearanceSettings.themeSystem")}
              </SelectItem>
              <SelectItem value="light">
                {t("appearanceSettings.themeLight")}
              </SelectItem>
              <SelectItem value="dark">
                {t("appearanceSettings.themeDark")}
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {t("appearanceSettings.themeHint")}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {t("appearanceSettings.highlightDeadlines")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("appearanceSettings.highlightDeadlinesHint")}
            </p>
          </div>
          <Switch
            checked={showDeadlines}
            onCheckedChange={setShowDeadlines}
            aria-label={t("appearanceSettings.highlightDeadlinesAria")}
          />
        </div>
      </section>
    </div>
  )
}
