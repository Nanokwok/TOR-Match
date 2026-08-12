import type { Metadata } from "next"

// Subscriptions / MRR / Pro / Enterprise — hidden for now
// import { SubscriptionsView } from "@/components/admin/subscriptions-view"
// import {
//   mockSubscriptions,
//   subscriptionStats,
// } from "@/server/db/mock/admin-subscriptions"

export const metadata: Metadata = {
  title: "Subscriptions | TOR Match Admin",
  robots: { index: false, follow: false },
}

export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-2 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
      <p className="text-sm text-muted-foreground">
        Subscriptions are temporarily disabled.
      </p>
    </div>
  )

  // return (
  //   <SubscriptionsView
  //     stats={subscriptionStats}
  //     subscriptions={mockSubscriptions}
  //   />
  // )
}
