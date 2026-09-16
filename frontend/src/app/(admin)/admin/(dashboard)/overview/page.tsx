import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAdminCompanyStatsAction } from "@/actions/admin-companies"
import { OverviewView } from "@/components/admin/overview-view"
import { AdminApiAuthError } from "@/lib/admin-api"
import {
  overviewActivity,
  overviewQueue,
  overviewStats,
  overviewTrend,
} from "@/server/db/mock/admin-overview"

export const metadata: Metadata = {
  title: "Overview | TOR Match Admin",
  robots: { index: false, follow: false },
}

export default async function AdminOverviewPage() {
  let activeCompanies: string = "—"
  let pendingCompanies = 0

  try {
    const companyStats = await getAdminCompanyStatsAction()
    activeCompanies = String(companyStats.active)
    pendingCompanies = companyStats.pending
  } catch (error) {
    if (error instanceof AdminApiAuthError) redirect("/admin/login")
    console.error("AdminOverviewPage company stats failed", error)
  }

  const queue = overviewQueue.map((item) =>
    item.label === "Pending companies"
      ? { ...item, value: pendingCompanies }
      : item
  )

  return (
    <OverviewView
      stats={{
        activeCompanies,
        torsNeedReview: overviewStats.torsNeedReview,
        ocrPending: overviewStats.ocrPending,
      }}
      trend={overviewTrend}
      queue={queue}
      activity={overviewActivity}
    />
  )
}
