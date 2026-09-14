import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  getTorReviewAction,
  listTorReviewsAction,
} from "@/actions/admin-tor-review"
import { TorReviewDetailView } from "@/components/admin/tor-review-detail-view"

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

  // The department dropdown offers the values already in the queue, so a
  // reviewer normalising a department name can pick an existing spelling.
  const departments = [
    ...new Set(
      (await listTorReviewsAction()).map((item) => item.department).filter(Boolean)
    ),
  ].sort()

  return <TorReviewDetailView tor={tor} departments={departments} />
}
