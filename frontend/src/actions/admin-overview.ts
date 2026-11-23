"use server"

import { AdminApiAuthError, adminApiFetch } from "@/lib/admin-api"
import type { AdminOverviewData } from "@/types/admin-overview"

export async function getAdminOverviewAction(): Promise<AdminOverviewData> {
  try {
    return await adminApiFetch<AdminOverviewData>("/admin/overview")
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      throw error
    }
    console.error("getAdminOverviewAction failed", error)
    return {
      stats: {
        activeCompanies: 0,
        pendingCompanies: 0,
        torsNeedReview: 0,
      },
      activity: [],
    }
  }
}
