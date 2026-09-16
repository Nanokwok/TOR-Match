import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { getAdminCompanyByIdAction } from "@/actions/admin-companies"
import { CompanyDetailView } from "@/components/admin/company-detail-view"
import { AdminApiAuthError } from "@/lib/admin-api"

type CompanyDetailPageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: CompanyDetailPageProps): Promise<Metadata> {
  const { id } = await params
  try {
    const company = await getAdminCompanyByIdAction(id)
    return {
      title: company
        ? `${company.nameEnglish || company.nameThai || "Company"} | Companies`
        : "Companies | TOR Match Admin",
      robots: { index: false, follow: false },
    }
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      return {
        title: "Companies | TOR Match Admin",
        robots: { index: false, follow: false },
      }
    }
    throw error
  }
}

export default async function AdminCompanyDetailPage({
  params,
}: CompanyDetailPageProps) {
  const { id } = await params

  let company
  try {
    company = await getAdminCompanyByIdAction(id)
  } catch (error) {
    if (error instanceof AdminApiAuthError) redirect("/admin/login")
    throw error
  }

  if (!company) notFound()

  return <CompanyDetailView company={company} />
}
