"use server"

import { adminApiFetch } from "@/lib/admin-api"

/** One day of the overview trend, as the backend counts it. */
export type AdminOverviewTrendPoint = {
  /** YYYY-MM-DD in Bangkok time. */
  date: string
  tors: number
  matches: number
}

/**
 * Where an activity row came from.
 *
 * Both are records written once, at the moment the thing happened: a ScrapeJob
 * per extraction, a Company per signup. Nothing records a reviewer's approval
 * yet, so the feed reports what the pipeline did, not what a person did.
 */
export type AdminOverviewActivityType = "ingest" | "company"

export type AdminOverviewActivity = {
  id: string
  type: AdminOverviewActivityType
  title: string
  detail: string
  /** ISO 8601. */
  at: string
}

export type AdminOverview = {
  torsNeedReview: number
  trend: AdminOverviewTrendPoint[]
  activity: AdminOverviewActivity[]
}

export async function getAdminOverviewAction(): Promise<AdminOverview> {
  return adminApiFetch<AdminOverview>("/admin/overview")
}
