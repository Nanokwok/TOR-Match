import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import {
  getAdminCompanyStatsAction,
  listAdminCompaniesAction,
} from "@/actions/admin-companies"
import { CompaniesView } from "@/components/admin/companies-view"
import { AdminApiAuthError } from "@/lib/admin-api"
import { ApiRequestError } from "@/lib/api-client"
import type {
  AdminCompanySize,
  AdminCompanyStatus,
} from "@/types/admin-company"

export const metadata: Metadata = {
  title: "Companies | TOR Match Admin",
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 5
const STATUSES = new Set<AdminCompanyStatus>(["active", "pending", "suspended"])
const SIZES = new Set<AdminCompanySize>(["micro", "small", "medium", "large"])

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}

export default async function AdminCompaniesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const q = first(params.q).trim()
  const statusRaw = first(params.status)
  const sizeRaw = first(params.size)
  const pageRaw = Number(first(params.page) || "1")

  const status: AdminCompanyStatus | "all" = STATUSES.has(
    statusRaw as AdminCompanyStatus
  )
    ? (statusRaw as AdminCompanyStatus)
    : "all"
  const size: AdminCompanySize | "all" = SIZES.has(sizeRaw as AdminCompanySize)
    ? (sizeRaw as AdminCompanySize)
    : "all"
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1

  let stats = null
  let companies: Awaited<ReturnType<typeof listAdminCompaniesAction>>["items"] =
    []
  let total = 0
  let error: string | null = null

  try {
    const [statsResult, listResult] = await Promise.all([
      getAdminCompanyStatsAction(),
      listAdminCompaniesAction({
        q,
        status,
        size,
        page,
        limit: PAGE_SIZE,
      }),
    ])
    stats = statsResult
    companies = listResult.items
    total = listResult.total
  } catch (err) {
    if (err instanceof AdminApiAuthError) {
      redirect("/admin/login")
    }
    error =
      err instanceof ApiRequestError
        ? err.message
        : "Failed to load companies."
    console.error("AdminCompaniesPage failed", err)
  }

  return (
    <Suspense fallback={null}>
      <CompaniesView
        stats={stats}
        companies={companies}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        q={q}
        status={status}
        size={size}
        error={error}
      />
    </Suspense>
  )
}
