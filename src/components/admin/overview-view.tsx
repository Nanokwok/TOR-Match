import Link from "next/link"
import {
  Building2,
  // CreditCard,
  FileSearch,
  ScanSearch,
} from "lucide-react"

import type {
  OverviewActivity,
  OverviewActivityType,
} from "@/server/db/mock/admin-overview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type OverviewViewProps = {
  stats: {
    activeCompanies: string
    torsNeedReview: string
    ocrPending: string
    // mrr: string
  }
  trend: readonly { label: string; tors: number; matches: number }[]
  queue: readonly { label: string; value: number; href: string }[]
  activity: OverviewActivity[]
}

const activityStyles: Record<OverviewActivityType, string> = {
  ocr: "border-transparent bg-amber-100 text-amber-800",
  review: "border-transparent bg-sky-100 text-sky-800",
  company: "border-transparent bg-violet-100 text-violet-800",
  subscription: "border-transparent bg-emerald-100 text-emerald-800",
}

const activityLabels: Record<OverviewActivityType, string> = {
  ocr: "OCR",
  review: "Review",
  company: "Company",
  subscription: "Billing",
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(new Date(value))
}

function MiniTrendChart({
  points,
}: {
  points: readonly { label: string; tors: number; matches: number }[]
}) {
  const width = 520
  const height = 180
  const padding = { top: 16, right: 16, bottom: 28, left: 28 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const maxY = Math.max(...points.flatMap((p) => [p.tors, p.matches]), 1)

  function x(index: number) {
    return padding.left + (index / Math.max(points.length - 1, 1)) * innerW
  }

  function y(value: number) {
    return padding.top + innerH - (value / maxY) * innerH
  }

  function path(key: "tors" | "matches") {
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point[key])}`)
      .join(" ")
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
      {[0.25, 0.5, 0.75, 1].map((ratio) => {
        const gy = padding.top + innerH * (1 - ratio)
        return (
          <line
            key={ratio}
            x1={padding.left}
            x2={width - padding.right}
            y1={gy}
            y2={gy}
            className="stroke-border"
            strokeWidth={1}
          />
        )
      })}
      <path d={path("matches")} fill="none" stroke="#0088c9" strokeWidth={2.5} />
      <path
        d={path("tors")}
        fill="none"
        stroke="#39bbf8"
        strokeWidth={2}
        strokeDasharray="4 4"
      />
      {points.map((point, index) => (
        <text
          key={point.label}
          x={x(index)}
          y={height - 8}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px]"
        >
          {point.label}
        </text>
      ))}
    </svg>
  )
}

export function OverviewView({
  stats,
  trend,
  queue,
  activity,
}: OverviewViewProps) {
  const statCards = [
    { label: "Active Companies", value: stats.activeCompanies },
    { label: "TORs Need Review", value: stats.torsNeedReview },
    { label: "OCR Pending", value: stats.ocrPending },
    // { label: "MRR", value: stats.mrr },
  ]

  const shortcuts = [
    { label: "Scraper & OCR", href: "/admin/scraper-ocr", icon: ScanSearch },
    { label: "TOR Review", href: "/admin/tor-review", icon: FileSearch },
    { label: "Companies", href: "/admin/companies", icon: Building2 },
    // { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
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

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Weekly TOR & Matches</CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#0088c9]" /> Matches
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#39bbf8]" /> New TORs
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <MiniTrendChart points={trend} />
          </CardContent>
        </Card>

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
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.map((item) => (
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
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
