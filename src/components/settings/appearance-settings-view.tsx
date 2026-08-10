"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft } from "lucide-react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export function AppearanceSettingsView() {
  const [theme, setTheme] = useState("system")
  const [showDeadlines, setShowDeadlines] = useState(true)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="space-y-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="size-4" />
          Back to Settings
        </Link>

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-950">
            Appearance & Display
          </h1>
          <p className="text-sm text-muted-foreground">
            Customize how TOR Match looks and how information is presented.
          </p>
        </header>
      </div>

      <section className="space-y-5 rounded-xl border border-border bg-white p-5">
        <div className="space-y-2">
          <Label htmlFor="theme" className="text-sm font-semibold">
            Theme
          </Label>
          <Select value={theme} onValueChange={(value) => value && setTheme(value)}>
            <SelectTrigger
              id="theme"
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
            Match your device preference or choose a fixed theme.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-neutral-950">
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
