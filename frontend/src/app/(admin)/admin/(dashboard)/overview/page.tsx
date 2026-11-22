import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAdminOverviewAction } from "@/actions/admin-overview"
import { OverviewView } from "@/components/admin/overview-view"
import { AdminApiAuthError } from "@/lib/admin-api"
import type { AdminOverviewData } from "@/types/admin-overview"

export const metadata: Metadata = {
  title: "Overview | TOR Match Admin",
  robots: { index: false, follow: false },
}

export default async function AdminOverviewPage() {
  let data: AdminOverviewData = {
    stats: {
      activeCompanies: 0,
      pendingCompanies: 0,
      torsNeedReview: 0,
    },
    activity: [],
  }

  try {
    data = await getAdminOverviewAction()
  } catch (error) {
    if (error instanceof AdminApiAuthError) redirect("/admin/login")
    console.error("AdminOverviewPage failed to load overview data", error)
  }

  const queue = [
    {
      label: "Need TOR review",
      value: data.stats.torsNeedReview,
      href: "/admin/tor-review",
    },
    {
      label: "Pending companies",
      value: data.stats.pendingCompanies,
      href: "/admin/companies?status=pending",
    },
  ]

  return (
    <OverviewView
      stats={{
        activeCompanies: String(data.stats.activeCompanies),
        torsNeedReview: String(data.stats.torsNeedReview),
        pendingCompanies: String(data.stats.pendingCompanies),
      }}
      queue={queue}
      activity={data.activity}
      pipelineHealth={data.pipelineHealth}
      recentJobs={data.recentJobs}
    />
  )
}
