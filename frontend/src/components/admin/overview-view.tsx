import Link from "next/link"
import {
  Building2,
  FileSearch,
  Settings,
} from "lucide-react"

import type {
  OverviewActivity,
  OverviewActivityType,
} from "@/types/admin-overview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type OverviewViewProps = {
  stats: {
    activeCompanies: string
    torsNeedReview: string
    pendingCompanies: string
  }
  queue: readonly { label: string; value: number; href: string }[]
  activity: OverviewActivity[]
}

const activityStyles: Record<OverviewActivityType, string> = {
  review: "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  company: "border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  subscription: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
}

const activityLabels: Record<OverviewActivityType, string> = {
  review: "Review",
  company: "Company",
  subscription: "Billing",
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Bangkok",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function OverviewView({
  stats,
  queue,
  activity,
}: OverviewViewProps) {
  const statCards = [
    { label: "Active Companies", value: stats.activeCompanies },
    { label: "TORs Need Review", value: stats.torsNeedReview },
    { label: "Pending Approval", value: stats.pendingCompanies },
  ]

  const shortcuts = [
    { label: "TOR Review", href: "/admin/tor-review", icon: FileSearch },
    { label: "Companies", href: "/admin/companies", icon: Building2 },
    { label: "System Settings", href: "/admin/settings", icon: Settings },
  ]

  return (
    <ScrollArea className="flex-1" viewportClassName="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          System snapshot for today
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => (
          <Card key={card.label} size="sm" className="bg-card">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attention Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {queue.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <span className="text-sm">{item.label}</span>
                  <Badge variant="secondary">{item.value}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-3">
              {shortcuts.map((item) => (
                <Button
                  key={item.href}
                  variant="outline"
                  className="h-10 justify-start"
                  nativeButton={false}
                  render={<Link href={item.href} />}
                >
                  <item.icon data-icon="inline-start" />
                  {item.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No recent activity recorded yet.
              </p>
            ) : (
              activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={cn(activityStyles[item.type])}>
                        {activityLabels[item.type]}
                      </Badge>
                      <p className="truncate text-sm font-medium">{item.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTime(item.at)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
