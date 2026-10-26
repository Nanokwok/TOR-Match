"use client"

import Link from "next/link"
import { Building2, FileSearch } from "lucide-react"

import type {
  OverviewActivity,
  OverviewActivityType,
} from "@/server/db/mock/admin-overview"
import { useLocale } from "@/components/i18n/locale-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Locale } from "@/lib/i18n"

type OverviewViewProps = {
  stats: {
    activeCompanies: string
    torsNeedReview: string
    // mrr: string
  }
  trend: readonly { label: string; tors: number; matches: number }[]
  queue: readonly { label: string; value: number; href: string }[]
  activity: OverviewActivity[]
}

const activityStyles: Record<OverviewActivityType, string> = {
  review: "border-transparent bg-sky-100 text-sky-800",
  company: "border-transparent bg-violet-100 text-violet-800",
  subscription: "border-transparent bg-emerald-100 text-emerald-800",
}

function formatTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
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
  const { t } = useLocale()
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
      {points.map((point, index) => {
        const translatedLabel = t(`admin.overviewPage.days.${point.label}`)
        return (
          <text
            key={point.label}
            x={x(index)}
            y={height - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {translatedLabel}
          </text>
        )
      })}
    </svg>
  )
}

export function OverviewView({
  stats,
  trend,
  queue,
  activity,
}: OverviewViewProps) {
  const { locale, t } = useLocale()

  const activityLabels: Record<OverviewActivityType, string> = {
    review: t("admin.overviewPage.review"),
    company: t("admin.overviewPage.company"),
    subscription: t("admin.overviewPage.billing"),
  }

  const statCards = [
    { label: t("admin.overviewPage.activeCompanies"), value: stats.activeCompanies },
    { label: t("admin.overviewPage.torsNeedReview"), value: stats.torsNeedReview },
  ]

  const shortcuts = [
    { label: t("admin.torReview"), href: "/admin/tor-review", icon: FileSearch },
    { label: t("admin.companies"), href: "/admin/companies", icon: Building2 },
  ]

  function getQueueLabel(itemLabel: string) {
    if (itemLabel === "Need TOR review") {
      return t("admin.overviewPage.needTorReview")
    }
    if (itemLabel === "Pending companies") {
      return t("admin.overviewPage.pendingCompanies")
    }
    return itemLabel
  }

  function getActivityText(item: OverviewActivity) {
    const titleKey = `admin.overviewPage.activity.${item.id}`
    const detailKey = `admin.overviewPage.activity.${item.id}-detail`
    const title = t(titleKey)
    const detail = t(detailKey)
    return {
      title: title !== titleKey ? title : item.title,
      detail: detail !== detailKey ? detail : item.detail,
    }
  }

  return (
    <ScrollArea className="flex-1" viewportClassName="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("admin.overviewPage.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("admin.overviewPage.subtitle")}
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
            <CardTitle className="text-base">
              {t("admin.overviewPage.weeklyTrendTitle")}
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#0088c9]" /> {t("admin.overviewPage.matches")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#39bbf8]" /> {t("admin.overviewPage.newTors")}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <MiniTrendChart points={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("admin.overviewPage.attentionQueue")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {queue.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <span className="text-sm">{getQueueLabel(item.label)}</span>
                <Badge variant="secondary">{item.value}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("admin.overviewPage.shortcuts")}
            </CardTitle>
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
            <CardTitle className="text-base">
              {t("admin.overviewPage.recentActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.map((item) => {
              const { title, detail } = getActivityText(item)
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={cn(activityStyles[item.type])}>
                        {activityLabels[item.type]}
                      </Badge>
                      <p className="truncate text-sm font-medium">{title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTime(item.at, locale)}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
