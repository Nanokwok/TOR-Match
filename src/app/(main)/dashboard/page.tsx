import type { Metadata } from "next"

import { DashboardView } from "@/components/dashboard/dashboard-view"
import { getDashboardData } from "@/server/services/dashboard.service"

export const metadata: Metadata = {
  title: "Dashboard | TOR Match",
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="min-h-0 flex-1 bg-background">
      <DashboardView data={data} />
    </div>
  )
}
