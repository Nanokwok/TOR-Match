"use server"

import { revalidatePath } from "next/cache"

import { AdminApiAuthError, adminApiFetch } from "@/lib/admin-api"
import { ApiRequestError } from "@/lib/api-client"
import type {
  AdminCompanyDetail,
  AdminCompanyListResult,
  AdminCompanySize,
  AdminCompanyStats,
  AdminCompanyStatus,
} from "@/types/admin-company"

export type AdminCompaniesListQuery = {
  q?: string
  status?: AdminCompanyStatus | "all"
  size?: AdminCompanySize | "all"
  page?: number
  limit?: number
}

export type AdminCompanyActionResult =
  | { ok: true; company: AdminCompanyDetail }
  | { ok: false; error: string }

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof AdminApiAuthError || error instanceof ApiRequestError) {
    return error.message
  }
  console.error(fallback, error)
  return "Something went wrong. Please try again."
}

function buildListPath(query: AdminCompaniesListQuery): string {
  const params = new URLSearchParams()
  const q = query.q?.trim()
  if (q) params.set("q", q)
  if (query.status && query.status !== "all") params.set("status", query.status)
  if (query.size && query.size !== "all") params.set("size", query.size)
  params.set("page", String(query.page && query.page > 0 ? query.page : 1))
  params.set("limit", String(query.limit && query.limit > 0 ? query.limit : 5))
  const qs = params.toString()
  return qs ? `/companies/admin?${qs}` : "/companies/admin"
}

export async function listAdminCompaniesAction(
  query: AdminCompaniesListQuery = {}
): Promise<AdminCompanyListResult> {
  return adminApiFetch<AdminCompanyListResult>(buildListPath(query))
}

export async function getAdminCompanyStatsAction(): Promise<AdminCompanyStats> {
  return adminApiFetch<AdminCompanyStats>("/companies/admin/stats")
}

export async function getAdminCompanyByIdAction(
  id: string
): Promise<AdminCompanyDetail | null> {
  try {
    return await adminApiFetch<AdminCompanyDetail>(`/companies/admin/${id}`)
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null
    throw error
  }
}

export async function updateAdminCompanyStatusAction(
  id: string,
  status: AdminCompanyStatus
): Promise<AdminCompanyActionResult> {
  try {
    const company = await adminApiFetch<AdminCompanyDetail>(
      `/companies/admin/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    )
    revalidatePath("/admin/companies")
    revalidatePath(`/admin/companies/${id}`)
    return { ok: true, company }
  } catch (error) {
    return {
      ok: false,
      error: messageFromError(error, "updateAdminCompanyStatusAction failed"),
    }
  }
}
