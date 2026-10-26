import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAdminCompanyStatsAction } from "@/actions/admin-companies"
import { getAdminOverviewAction } from "@/actions/admin-overview"
import { OverviewView } from "@/components/admin/overview-view"
import { AdminApiAuthError } from "@/lib/admin-api"
import { overviewActivity } from "@/server/db/mock/admin-overview"

export const metadata: Metadata = {
  title: "Overview | TOR Match Admin",
  robots: { index: false, follow: false },
}

/** "Mon", "Tue", … for a YYYY-MM-DD the backend counted in Bangkok time. */
function weekdayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00+07:00`))
}

export default async function AdminOverviewPage() {
  let activeCompanies: string = "—"
  let pendingCompanies = 0
  let torsNeedReview = "—"
  let trend: { label: string; tors: number; matches: number }[] = []

  // Asked for separately so one failing panel does not blank the others: the
  // company counts and the TOR counts come from different parts of the API.
  try {
    const companyStats = await getAdminCompanyStatsAction()
    activeCompanies = String(companyStats.active)
    pendingCompanies = companyStats.pending
  } catch (error) {
    if (error instanceof AdminApiAuthError) redirect("/admin/login")
    console.error("AdminOverviewPage company stats failed", error)
  }

  try {
    const overview = await getAdminOverviewAction()
    torsNeedReview = String(overview.torsNeedReview)
    trend = overview.trend.map((point) => ({
      label: weekdayLabel(point.date),
      tors: point.tors,
      matches: point.matches,
    }))
  } catch (error) {
    if (error instanceof AdminApiAuthError) redirect("/admin/login")
    console.error("AdminOverviewPage overview failed", error)
  }

  // A dash rather than a zero when the count could not be read: "0 waiting"
  // is a claim, and a reviewer who believes it stops checking the queue.
  const queue = [
    { label: "Need TOR review", value: torsNeedReview, href: "/admin/tor-review" },
    { label: "Pending companies", value: pendingCompanies, href: "/admin/companies" },
  ]

  return (
    <OverviewView
      stats={{ activeCompanies, torsNeedReview }}
      trend={trend}
      queue={queue}
      activity={overviewActivity}
    />
  )
}
