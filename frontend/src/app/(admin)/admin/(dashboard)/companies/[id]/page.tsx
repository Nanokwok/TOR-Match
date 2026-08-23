import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CompanyDetailView } from "@/components/admin/company-detail-view"
import { getAdminCompanyById } from "@/server/db/mock/admin-companies"

type CompanyDetailPageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: CompanyDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const company = getAdminCompanyById(id)
  return {
    title: company
      ? `${company.nameEnglish} | Companies`
      : "Companies | TOR Match Admin",
    robots: { index: false, follow: false },
  }
}

export default async function AdminCompanyDetailPage({
  params,
}: CompanyDetailPageProps) {
  const { id } = await params
  const company = getAdminCompanyById(id)
  if (!company) notFound()

  return <CompanyDetailView company={company} />
}
