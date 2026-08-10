"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft } from "lucide-react"

import { useTheme } from "@/components/theme/theme-provider"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
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
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [showDeadlines, setShowDeadlines] = useState(true)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="space-y-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Settings
        </Link>

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Appearance & Display
          </h1>
          <p className="text-sm text-muted-foreground">
            Customize how TOR Match looks and how information is presented.
          </p>
        </header>
      </div>

      <section className="space-y-5 rounded-xl border border-border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="theme-preference" className="text-sm font-semibold">
            Theme preference
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
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Use system preference, or lock the app to light or dark.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Highlight deadlines
            </p>
            <p className="text-sm text-muted-foreground">
              Emphasize approaching submission dates in browse and workspace.
            </p>
          </div>
          <Switch
            checked={showDeadlines}
            onCheckedChange={setShowDeadlines}
            aria-label="Highlight deadlines"
          />
        </div>
      </section>
    </div>
  )
}
