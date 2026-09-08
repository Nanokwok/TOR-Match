"use client"

import type { ComponentType } from "react"
import { Coins, Gavel, Network } from "lucide-react"

import { useLocale } from "@/components/i18n/locale-provider"
import {
  formatMilestoneLabel,
  formatThb,
} from "@/lib/format"
import { procurementMethodLabel } from "@/lib/browse-labels"
import type { LocalizedTorView } from "@/lib/localized-tor"

type TorFinancialsPanelProps = {
  /** Already flattened to the active locale by `localizeTor`. */
  financials: LocalizedTorView["financials"]
}

export function TorFinancialsPanel({ financials }: TorFinancialsPanelProps) {
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
        <h3 className="text-sm font-semibold text-foreground">
          {t("browse.financialPanel.paymentMilestones")}
        </h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="px-4 py-3 font-medium">
                  {t("browse.financialPanel.day")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("browse.financialPanel.milestone")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("browse.financialPanel.deliverable")}
                </th>
              </tr>
            </thead>
            <tbody>
              {financials.milestones.map((milestone) => (
                <tr
                  key={`${milestone.milestoneNumber}-${milestone.day}`}
                  className="border-t border-border bg-card"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-foreground">
                    {t("browse.financialPanel.days", { count: milestone.day })}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {formatMilestoneLabel(
                      milestone.milestoneNumber,
                      milestone.percent,
                      milestone.amountBaht,
                      locale
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {milestone.deliverable}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
