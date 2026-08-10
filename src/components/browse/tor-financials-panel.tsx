import type { ComponentType } from "react"
import { Coins, Gavel, Network } from "lucide-react"

import {
  formatMilestoneLabel,
  formatThb,
} from "@/lib/format"
import type { TorFinancials } from "@/types/tor"

type TorFinancialsPanelProps = {
  financials: TorFinancials
}

export function TorFinancialsPanel({ financials }: TorFinancialsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={Coins}
          label="Total Budget"
          value={formatThb(financials.totalBudgetBaht)}
        />
        <Metric
          icon={Network}
          label="Median Price"
          value={formatThb(financials.medianPriceBaht)}
        />
        <Metric
          icon={Gavel}
          label="Procurement Method"
          value={financials.method}
        />
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Payment Milestones
        </h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="px-4 py-3 font-medium">Day</th>
                <th className="px-4 py-3 font-medium">Milestone</th>
                <th className="px-4 py-3 font-medium">Deliverable</th>
              </tr>
            </thead>
            <tbody>
              {financials.milestones.map((milestone) => (
                <tr
                  key={`${milestone.milestoneNumber}-${milestone.day}`}
                  className="border-t border-border bg-card"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-foreground">
                    {milestone.day} Days
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {formatMilestoneLabel(
                      milestone.milestoneNumber,
                      milestone.percent,
                      milestone.amountBaht
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
