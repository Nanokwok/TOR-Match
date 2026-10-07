"use client"

import type { ComponentType } from "react"
import { useEffect, useRef, useState } from "react"
import {
  Coins,
  Gavel,
  Network,
} from "lucide-react"

import { useLocale } from "@/components/i18n/locale-provider"
import { formatThb } from "@/lib/format"
import { procurementMethodLabel } from "@/lib/browse-labels"
import { cn } from "@/lib/utils"
import type { LocalizedTorView } from "@/lib/localized-tor"

type TorFinancialsPanelProps = {
  /** Already flattened to the active locale by `localizeTor`. */
  financials: LocalizedTorView["financials"]
  isCollapsed?: boolean
}

export function TorFinancialsPanel({
  financials,
  isCollapsed = false,
}: TorFinancialsPanelProps) {
  const { locale, t } = useLocale()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={Coins}
          label={t("browse.financialPanel.totalBudget")}
          value={formatThb(financials.totalBudgetBaht, locale)}
        />
        <Metric
          icon={Network}
          label={t("browse.financialPanel.medianPrice")}
          value={formatThb(financials.medianPriceBaht, locale)}
        />
        <Metric
          icon={Gavel}
          label={t("browse.financialPanel.procurementMethod")}
          value={procurementMethodLabel(financials.method, t)}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {t("browse.financialPanel.paymentMilestones")}
          </h3>
          <span className="text-xs text-muted-foreground">
            {t("browse.financialPanel.totalMilestones", {
              count: financials.milestones.length,
            })}
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <thead className={cn(isCollapsed && "invisible")}>
              <tr className={cn(isCollapsed ? "h-0" : "bg-primary text-primary-foreground")}>
                <th className={cn("w-28 sm:w-36", isCollapsed ? "h-0 py-0 border-0" : "px-4 py-3 font-medium")}>
                  {!isCollapsed && t("browse.financialPanel.day")}
                </th>
                <th className={cn("w-48 sm:w-56", isCollapsed ? "h-0 py-0 border-0" : "px-4 py-3 font-medium")}>
                  {!isCollapsed && t("browse.financialPanel.paymentMilestones")}
                </th>
                <th className={cn(isCollapsed ? "h-0 py-0 border-0" : "px-4 py-3 font-medium")}>
                  {!isCollapsed && t("browse.financialPanel.deliverable")}
                </th>
              </tr>
            </thead>
            <tbody>
              {financials.milestones.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="p-6 text-center text-sm text-muted-foreground"
                  >
                    {t("common.notSpecified")}
                  </td>
                </tr>
              ) : (
                financials.milestones.map((milestone) => (
                  <tr
                    key={`${milestone.milestoneNumber}-${milestone.day}`}
                    className="border-t border-border bg-card transition-colors hover:bg-muted/30"
                  >
                    <td className="w-28 sm:w-36 px-4 py-3.5 whitespace-nowrap align-top">
                      <span className="inline-block rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-medium text-foreground">
                        {t("browse.financialPanel.days", {
                          count: milestone.day,
                        })}
                      </span>
                    </td>
                    <td className="w-48 sm:w-56 px-4 py-3.5 whitespace-nowrap align-top">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {locale === "th"
                              ? `งวดที่ ${milestone.milestoneNumber}`
                              : `Milestone ${milestone.milestoneNumber}`}
                          </span>
                          <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {milestone.percent}%
                          </span>
                        </div>
                        <div className="text-sm font-semibold tracking-tight text-foreground">
                          {formatThb(milestone.amountBaht, locale)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <DeliverableCell
                        text={milestone.deliverable}
                        readMoreLabel={t("browse.financialPanel.readMore")}
                        showLessLabel={t("browse.financialPanel.showLess")}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function DeliverableCell({
  text,
  readMoreLabel,
  showLessLabel,
}: {
  text: string
  readMoreLabel: string
  showLessLabel: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [truncatedText, setTruncatedText] = useState("")
  const measureRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = measureRef.current
    if (!el) return

    const compute = () => {
      // 1. Measure if the full text exceeds 2 lines
      el.textContent = text
      const computed = window.getComputedStyle(el)
      const lineHeight = parseFloat(computed.lineHeight) || 20
      const max2LinesHeight = lineHeight * 2 + 2

      if (el.scrollHeight <= max2LinesHeight) {
        setIsOverflowing(false)
        setTruncatedText(text)
        return
      }

      setIsOverflowing(true)

      // 2. Binary search for cutoff point so `truncated + "… " + readMoreLabel` fits on line 2
      let low = 0
      let high = text.length
      let best = 0
      const suffix = "… " + readMoreLabel

      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        el.textContent = text.slice(0, mid) + suffix
        if (el.scrollHeight <= max2LinesHeight) {
          best = mid
          low = mid + 1
        } else {
          high = mid - 1
        }
      }

      setTruncatedText(text.slice(0, best).trimEnd())
      el.textContent = ""
    }

    compute()

    const observer = new ResizeObserver(() => {
      compute()
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [text, readMoreLabel])

  if (!isOverflowing) {
    return (
      <div className="relative">
        <p className="leading-relaxed text-muted-foreground">{text}</p>
        <p
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute inset-x-0 top-0 leading-relaxed text-muted-foreground"
        />
      </div>
    )
  }

  return (
    <div className="relative">
      <p className="leading-relaxed text-muted-foreground">
        {isExpanded ? (
          <>
            {text}{" "}
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="inline cursor-pointer font-medium text-primary hover:underline focus-visible:outline-none"
            >
              {showLessLabel}
            </button>
          </>
        ) : (
          <>
            {truncatedText}…{" "}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="inline cursor-pointer font-medium text-primary hover:underline focus-visible:outline-none"
            >
              {readMoreLabel}
            </button>
          </>
        )}
      </p>

      {/* Hidden measurement target with identical width & font styles */}
      <p
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute inset-x-0 top-0 leading-relaxed text-muted-foreground"
      />
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}
