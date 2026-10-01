"use client"

import { Clock3 } from "lucide-react"

import { useLocale } from "@/components/i18n/locale-provider"
import { useDeadlineHighlight } from "@/components/preferences/deadline-highlight-provider"
import {
  DEFAULT_APPROACHING_DEADLINE_DAYS,
  getDeadlineStatus,
  isValidDateString,
} from "@/lib/deadline"
import { formatShortDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export type DeadlineBadgeProps = {
  deadline: string | null | undefined
  variant?: "badge" | "inline"
  thresholdDays?: number
  hideIfNotApproaching?: boolean
  compact?: boolean
  forceHighlight?: boolean
  className?: string
  iconClassName?: string
}

export function DeadlineBadge({
  deadline,
  variant = "badge",
  thresholdDays = DEFAULT_APPROACHING_DEADLINE_DAYS,
  hideIfNotApproaching,
  compact,
  forceHighlight,
  className,
  iconClassName,
}: DeadlineBadgeProps) {
  const { locale, t } = useLocale()
  const { highlightDeadlines } = useDeadlineHighlight()

  if (!isValidDateString(deadline)) return null

  const effectiveHighlight = forceHighlight ?? highlightDeadlines
  const status = getDeadlineStatus(deadline, thresholdDays)
  const isEmphasized = effectiveHighlight && status.isApproaching

  const isCompact = compact ?? variant === "badge"
  const shouldHide =
    hideIfNotApproaching ?? (variant === "badge")

  if (variant === "badge" && (!isEmphasized || shouldHide && !status.isApproaching)) {
    return null
  }

  const daysLeftLabels = {
    dueToday: t("workspace.dueToday"),
    oneDayLeft: t("workspace.oneDayLeft"),
    daysLeft: t("workspace.daysLeft"),
  }

  const days = status.daysLeft
  const baseLabel =
    days <= 0
      ? daysLeftLabels.dueToday
      : days === 1
        ? daysLeftLabels.oneDayLeft
        : daysLeftLabels.daysLeft.replace("{days}", String(days))

  const displayText = isCompact
    ? baseLabel
    : `${baseLabel} (${formatShortDate(deadline, locale)})`

  if (variant === "badge") {
    const isCritical = status.urgency === "critical" || status.daysLeft <= 1
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-tight transition-colors",
          isCritical
            ? "border-red-500/30 bg-red-500/10 text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300",
          className
        )}
      >
        <Clock3 className={cn("size-3 shrink-0", iconClassName)} aria-hidden />
        <span>{displayText}</span>
      </span>
    )
  }

  if (isEmphasized) {
    const isCritical = status.urgency === "critical" || status.daysLeft <= 1
    return (
      <p
        className={cn(
          "flex items-center gap-1.5 font-medium transition-colors",
          isCritical
            ? "text-red-700 dark:text-red-300"
            : "text-amber-700 dark:text-amber-300",
          className
        )}
      >
        <Clock3
          className={cn(
            "size-3.5 shrink-0",
            isCritical
              ? "text-red-600 dark:text-red-400"
              : "text-amber-600 dark:text-amber-400",
            iconClassName
          )}
          aria-hidden
        />
        <span>{displayText}</span>
      </p>
    )
  }

  return (
    <p className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
      <Clock3
        className={cn("size-3.5 shrink-0 text-primary", iconClassName)}
        aria-hidden
      />
      <span>{displayText}</span>
    </p>
  )
}
