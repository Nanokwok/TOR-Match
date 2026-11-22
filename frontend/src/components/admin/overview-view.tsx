"use client"

import Link from "next/link"
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSearch,
  Loader2,
  Settings,
} from "lucide-react"

import type {
  OverviewActivity,
  OverviewActivityType,
  OverviewScrapeJob,
  PipelineHealth,
} from "@/types/admin-overview"
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
    pendingCompanies: string
  }
  queue: readonly { label: string; value: number; href: string }[]
  activity: OverviewActivity[]
  pipelineHealth?: PipelineHealth
  recentJobs?: OverviewScrapeJob[]
}

const activityStyles: Record<OverviewActivityType, string> = {
  review: "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  company: "border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  subscription: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
}

const jobStatusStyles: Record<string, string> = {
  success: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  running: "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 animate-pulse",
  failure: "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  skipped: "border-transparent bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300",
}

function formatTime(value: string, locale: Locale) {
  try {
    return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
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
  pipelineHealth,
  recentJobs = [],
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
    { label: t("admin.overviewPage.pendingCompanies"), value: stats.pendingCompanies },
  ]

  const shortcuts = [
    { label: t("admin.torReview"), href: "/admin/tor-review", icon: FileSearch },
    { label: t("admin.companies"), href: "/admin/companies", icon: Building2 },
    { label: t("admin.settings"), href: "/admin/settings", icon: Settings },
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

      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-4">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("admin.overviewPage.shortcuts")}
              </CardTitle>
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
            <CardTitle className="text-base">
              {t("admin.overviewPage.recentActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {locale === "th" ? "ยังไม่มีบันทึกกิจกรรมล่าสุด" : "No recent activity recorded yet."}
              </p>
            ) : (
              activity.map((item) => {
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
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* API Ingest & Pipeline Health Monitoring (FR-7.3) */}
      <Card className="flex flex-col">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              <CardTitle className="text-base">
                {t("admin.overviewPage.pipelineHealth")}
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("admin.overviewPage.pipelineSubtitle")}
            </p>
          </div>
          {pipelineHealth ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="gap-1.5 py-1">
                <span className="text-muted-foreground">{t("admin.overviewPage.totalJobs")}:</span>
                <span className="font-semibold">{pipelineHealth.totalJobs}</span>
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5 py-1 font-semibold",
                  pipelineHealth.successRatePercent >= 80
                    ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                )}
              >
                {t("admin.overviewPage.successRate")}: {pipelineHealth.successRatePercent}%
              </Badge>
              {pipelineHealth.runningJobs > 0 ? (
                <Badge className="bg-sky-500 text-white gap-1 animate-pulse py-1">
                  <Loader2 className="size-3 animate-spin" />
                  {t("admin.overviewPage.runningJobs")}: {pipelineHealth.runningJobs}
                </Badge>
              ) : null}
              {pipelineHealth.failedJobs > 0 ? (
                <Badge variant="destructive" className="gap-1 py-1">
                  <AlertCircle className="size-3" />
                  {t("admin.overviewPage.failedJobs")}: {pipelineHealth.failedJobs}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-card">
            <div className="p-3 border-b text-xs font-semibold text-muted-foreground grid grid-cols-[1.5fr_1fr_1fr_1fr] sm:grid-cols-[2fr_1fr_1fr_1fr_1.2fr] gap-2 items-center">
              <div>{t("admin.overviewPage.documentSource")}</div>
              <div>{t("admin.overviewPage.stage")}</div>
              <div>{t("admin.overviewPage.status")}</div>
              <div className="hidden sm:block">{t("admin.overviewPage.pages")}</div>
              <div className="text-right">{t("admin.overviewPage.time")}</div>
            </div>
            {recentJobs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {t("admin.overviewPage.noJobs")}
              </div>
            ) : (
              <div className="divide-y">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 text-xs grid grid-cols-[1.5fr_1fr_1fr_1fr] sm:grid-cols-[2fr_1fr_1fr_1fr_1.2fr] gap-2 items-center hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium truncate text-foreground" title={job.documentSource}>
                        {job.documentSource}
                      </p>
                      {job.sourceUrl ? (
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                        >
                          <span className="truncate">{job.sourceUrl}</span>
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      ) : null}
                      {job.errorMessage ? (
                        <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-mono line-clamp-1">
                          {job.errorMessage}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0.5">
                        {job.stage}
                      </Badge>
                    </div>
                    <div>
                      <Badge className={cn("text-[11px] font-medium capitalize", jobStatusStyles[job.status] ?? "")}>
                        {job.status === "success" && <CheckCircle2 className="size-3 mr-1 inline" />}
                        {job.status === "running" && <Loader2 className="size-3 mr-1 inline animate-spin" />}
                        {job.status === "failure" && <AlertCircle className="size-3 mr-1 inline" />}
                        {t(`admin.overviewPage.job${job.status.charAt(0).toUpperCase() + job.status.slice(1)}`) || job.status}
                      </Badge>
                    </div>
                    <div className="hidden sm:block font-mono text-muted-foreground">
                      {job.pages}
                    </div>
                    <div className="text-right text-muted-foreground font-mono text-[11px]">
                      {formatTime(job.createdAt, locale)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </ScrollArea>
  )
}
