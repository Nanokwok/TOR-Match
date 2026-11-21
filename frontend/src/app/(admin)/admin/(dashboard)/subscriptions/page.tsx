import type { Metadata } from "next"

import { SubscriptionsPlaceholder } from "@/components/admin/subscriptions-placeholder"

export const metadata: Metadata = {
  title: "Subscriptions | TOR Match Admin",
  robots: { index: false, follow: false },
}

export default function AdminSubscriptionsPage() {
  return <SubscriptionsPlaceholder />
}
