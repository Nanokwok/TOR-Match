import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { TorReviewDetailView } from "@/components/admin/tor-review-detail-view"
import {
  getTorReviewById,
  torReviewDepartments,
} from "@/server/db/mock/admin-tor-review"

type TorReviewDetailPageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: TorReviewDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const tor = getTorReviewById(id)
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
  const tor = getTorReviewById(id)
  if (!tor) notFound()

  return (
    <TorReviewDetailView tor={tor} departments={torReviewDepartments} />
  )
}
