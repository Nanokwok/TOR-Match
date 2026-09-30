import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  getTorReviewAction,
  listTorReviewsAction,
} from "@/actions/admin-tor-review"
import { TorReviewDetailView } from "@/components/admin/tor-review-detail-view"
import { apiFetch } from "@/lib/api-client"
import type { LocalizedText } from "@/types/localized"

type TorReviewDetailPageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: TorReviewDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const tor = await getTorReviewAction(id)
  return {
    title: tor
      ? `${tor.announcementId} | TOR Review`
      : "TOR Review | TOR Match Admin",
    robots: { index: false, follow: false },
  }
}

export default async function AdminTorReviewDetailPage({
  params,
}: TorReviewDetailPageProps) {
  const { id } = await params
  const tor = await getTorReviewAction(id)
  if (!tor) notFound()

  // Suggestions only — the field stays free text. Offering existing Thai
  // spellings keeps the browse filter from splitting one department in two.
  const [published, queue] = await Promise.all([
    apiFetch<LocalizedText[]>("/tors/departments", { auth: false }).catch(() => []),
    listTorReviewsAction(),
  ])
  const departments = [
    ...new Set([
      ...published.map((item) => item.th || item.en),
      ...queue.map((item) => item.department),
    ]),
  ]
    .filter(Boolean)
    .sort()

  return <TorReviewDetailView tor={tor} departments={departments} />
}
