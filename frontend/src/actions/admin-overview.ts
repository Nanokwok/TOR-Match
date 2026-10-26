"use server"

import { adminApiFetch } from "@/lib/admin-api"

/** One day of the overview trend, as the backend counts it. */
export type AdminOverviewTrendPoint = {
  /** YYYY-MM-DD in Bangkok time. */
  date: string
  tors: number
  matches: number
}

export type AdminOverview = {
  torsNeedReview: number
  trend: AdminOverviewTrendPoint[]
}

export async function getAdminOverviewAction(): Promise<AdminOverview> {
  return adminApiFetch<AdminOverview>("/admin/overview")
}
