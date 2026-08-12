import type { Metadata } from "next"

import { OverviewView } from "@/components/admin/overview-view"
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

export default function AdminOverviewPage() {
  return (
    <OverviewView
      stats={overviewStats}
      trend={overviewTrend}
      queue={overviewQueue}
      activity={overviewActivity}
    />
  )
}
