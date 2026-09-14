import type { Metadata } from "next"

import { listTorReviewsAction } from "@/actions/admin-tor-review"
import { TorReviewListView } from "@/components/admin/tor-review-list-view"

export const metadata: Metadata = {
  title: "TOR Review | TOR Match Admin",
  robots: { index: false, follow: false },
}

export default async function AdminTorReviewPage() {
  return <TorReviewListView items={await listTorReviewsAction()} />
}
