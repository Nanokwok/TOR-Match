"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, ChevronRight, LogOut, Monitor } from "lucide-react"

import { Button } from "@/components/ui/button"
import { browseActions } from "@/lib/browse-actions"
import { cn } from "@/lib/utils"

const SETTINGS_LINKS = [
  {
    href: "/settings/notifications",
    title: "Notification Settings",
    description: "Control in-app and email alerts, digests, and event preferences.",
    icon: Bell,
  },
  {
    href: "/settings/appearance",
    title: "Appearance & Display",
    description: "Adjust theme, density, and how content is shown across TOR Match.",
    icon: Monitor,
  },
] as const

export function SettingsHubView() {
  const router = useRouter()

  function handleLogout() {
    browseActions.logout()
    router.push("/login")
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account preferences and session.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        {SETTINGS_LINKS.map((item, index) => {
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60",
                index > 0 && "border-t border-border"
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {item.description}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          )
        })}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Log Out</h2>
            <p className="text-sm text-muted-foreground">
              Securely end your current session on this device.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </div>
      </section>
    </div>
  )
}
