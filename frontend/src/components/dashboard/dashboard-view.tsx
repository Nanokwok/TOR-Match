"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { browseActions } from "@/lib/browse-actions"
import { formatDaysLeft, formatThb } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { DashboardData } from "@/types/dashboard"

type DashboardViewProps = {
  data: DashboardData
}

export function DashboardView({ data }: DashboardViewProps) {
  const activeBids = data.metrics.find((metric) => metric.id === "active-bids")
  const upcoming = data.metrics.find(
    (metric) => metric.id === "upcoming-deadlines"
  )

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_90%_80%_at_12%_0%,rgba(0,136,201,0.18),transparent_55%),radial-gradient(ellipse_70%_60%_at_88%_8%,rgba(113,220,255,0.22),transparent_50%)]"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 md:px-8">
        <section className="grid gap-10 pt-12 pb-14 md:grid-cols-[1.2fr_0.8fr] md:items-end md:gap-16 md:pt-16 md:pb-16">
          <div>
            <p className="font-script text-3xl text-primary md:text-4xl">
              Pipeline
            </p>
            <h1 className="mt-2 max-w-xl text-4xl leading-[1.08] font-medium tracking-tight text-foreground md:text-5xl">
              Your BMA bid
              <br />
              desk, at a glance.
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground">
              See what&apos;s moving in workspace, what closes this week, and
              which eligible TORs deserve a look next.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-foreground/10 pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-10">
            <MetricBlock
              value={activeBids?.value ?? 0}
              label="Active bids"
              hint="In proposal prep"
              href="/workspace"
            />
            <MetricBlock
              value={upcoming?.value ?? 0}
              label="Closing in 7 days"
              hint="Tracked in workspace"
              href="/workspace"
            />
          </div>
        </section>

        <section className="space-y-8 border-t border-foreground/10 pt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-medium tracking-tight text-foreground">
                Recommended for you
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Eligible TORs scored against your company profile
              </p>
            </div>
            <Link
              href="/browse"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Open browse →
            </Link>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {data.recommendedTors.map((tor, index) => (
              <RecommendedTorRow
                key={tor.id}
                tor={tor}
                index={index + 1}
              />
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-medium tracking-tight text-foreground">
              Announcements & budget
            </h2>
            <p className="mt-1 mb-6 text-sm text-muted-foreground">
              Last 12 months of published volume vs allocated budget
            </p>
            <MonthlyTrendChart points={data.monthlyTrend} />
          </div>

          <div>
            <h2 className="text-2xl font-medium tracking-tight text-foreground">
              Bangkok districts
            </h2>
            <p className="mt-1 mb-6 text-sm text-muted-foreground">
              Where procurement density is concentrating across 50 offices
            </p>
            <DistrictDistributionChart points={data.districtDistribution} />
          </div>
        </section>
      </div>
    </div>
  )
}

function MetricBlock({
  value,
  label,
  hint,
  href,
}: {
  value: number
  label: string
  hint: string
  href: string
}) {
  return (
    <Link href={href} className="group block space-y-2">
      <p className="font-script text-5xl leading-none text-primary transition-transform group-hover:translate-x-0.5 md:text-6xl">
        {value}
      </p>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </Link>
  )
}

function RecommendedTorRow({
  tor,
  index,
}: {
  tor: DashboardData["recommendedTors"][number]
  index: number
}) {
  const router = useRouter()

  return (
    <article className="grid gap-4 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-6">
      <span className="font-script text-3xl text-primary/80">{index}</span>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-base font-semibold text-foreground sm:text-lg">
            {tor.title}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {tor.department}
          <span className="mx-2 text-border">·</span>
          {formatThb(tor.budgetBaht)}
          <span className="mx-2 text-border">·</span>
          {formatDaysLeft(tor.deadline)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="h-9 px-3 text-foreground hover:bg-muted"
          onClick={() => browseActions.bookmarkTor(tor.id)}
        >
          Quick Save
        </Button>
        <Button
          type="button"
          className="h-9 bg-[#0088C9] px-4 text-white hover:bg-[#007ab4]"
          onClick={() => router.push(`/browse?tor=${tor.id}`)}
        >
          Check Eligibility
        </Button>
      </div>
    </article>
  )
}

function MonthlyTrendChart({
  points,
}: {
  points: DashboardData["monthlyTrend"]
}) {
  const width = 640
  const height = 280
  const padding = { top: 12, right: 44, bottom: 32, left: 28 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const maxCount = Math.max(...points.map((point) => point.announcementCount), 1)
  const maxBudget = Math.max(...points.map((point) => point.budgetBaht), 1)
  const barWidth = innerW / points.length

  const linePoints = points
    .map((point, index) => {
      const x = padding.left + index * barWidth + barWidth / 2
      const y = padding.top + innerH - (point.budgetBaht / maxBudget) * innerH
      return `${x},${y}`
    })
    .join(" ")

  const areaPoints = [
    `${padding.left + barWidth / 2},${padding.top + innerH}`,
    ...points.map((point, index) => {
      const x = padding.left + index * barWidth + barWidth / 2
      const y = padding.top + innerH - (point.budgetBaht / maxBudget) * innerH
      return `${x},${y}`
    }),
    `${padding.left + (points.length - 1) * barWidth + barWidth / 2},${padding.top + innerH}`,
  ].join(" ")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 bg-[#0088C9]/80" />
          Announcements
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-5 bg-[#0a0a0a] dark:bg-foreground" />
          Budget
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="12-month TOR announcement and budget trend"
      >
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = padding.top + innerH * (1 - ratio)
          return (
            <line
              key={ratio}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              className="stroke-foreground/10"
              strokeWidth={1}
            />
          )
        })}

        {points.map((point, index) => {
          const barH = (point.announcementCount / maxCount) * innerH * 0.85
          const x = padding.left + index * barWidth + barWidth * 0.25
          const y = padding.top + innerH - barH
          return (
            <g key={point.monthKey}>
              <rect
                x={x}
                y={y}
                width={barWidth * 0.5}
                height={barH}
                className="fill-[#0088C9]/75"
              />
              <text
                x={padding.left + index * barWidth + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {point.label}
              </text>
            </g>
          )
        })}

        <polygon points={areaPoints} className="fill-foreground/[0.04]" />
        <polyline
          points={linePoints}
          fill="none"
          className="stroke-foreground"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

function DistrictDistributionChart({
  points,
}: {
  points: DashboardData["districtDistribution"]
}) {
  const maxCount = Math.max(...points.map((point) => point.projectCount), 1)
  const top = points.slice(0, 12)
  const rest = points.slice(12)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {top.map((point, index) => {
          const width = (point.projectCount / maxCount) * 100
          return (
            <div key={point.district} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3">
              <p className="truncate text-sm text-foreground">{point.district}</p>
              <div className="h-px bg-foreground/10">
                <div
                  className="h-px bg-[#0088C9] transition-[width] duration-500"
                  style={{ width: `${width}%`, height: 3, marginTop: -1 }}
                />
              </div>
              <p className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                {point.projectCount}
                <span className="text-foreground/30"> · </span>
                {formatCompactBudget(point.budgetBaht)}
              </p>
              <span className="sr-only">Rank {index + 1}</span>
            </div>
          )
        })}
      </div>

      <details className="group">
        <summary className="cursor-pointer list-none text-sm font-medium text-primary underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
          Show all 50 districts
          <span className="ml-1 text-muted-foreground group-open:hidden">
            ({rest.length} more)
          </span>
        </summary>
        <div className="mt-4 max-h-64 space-y-2.5 overflow-y-auto border-t border-border pt-4">
          {rest.map((point) => {
            const width = (point.projectCount / maxCount) * 100
            return (
              <div
                key={point.district}
                className="grid grid-cols-[7rem_1fr_auto] items-center gap-3"
              >
                <p className="truncate text-sm text-foreground">
                  {point.district}
                </p>
                <div className="h-px bg-foreground/10">
                  <div
                    className={cn("bg-[#0088C9]/70")}
                    style={{ width: `${width}%`, height: 2, marginTop: -0.5 }}
                  />
                </div>
                <p className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                  {point.projectCount}
                </p>
              </div>
            )
          })}
        </div>
      </details>
    </div>
  )
}

function formatCompactBudget(value: number) {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`
  }
  return String(Math.round(value))
}
