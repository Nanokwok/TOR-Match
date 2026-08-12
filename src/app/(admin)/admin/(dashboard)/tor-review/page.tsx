import type { Metadata } from "next"

import { TorReviewListView } from "@/components/admin/tor-review-list-view"
import { listTorReviews } from "@/server/db/mock/admin-tor-review"

export const metadata: Metadata = {
  title: "TOR Review | TOR Match Admin",
  robots: { index: false, follow: false },
}

export default function AdminTorReviewPage() {
  return <TorReviewListView items={listTorReviews()} />
}
