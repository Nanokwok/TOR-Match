import type { Metadata } from "next"

import { CompaniesView } from "@/components/admin/companies-view"
import {
  companyStats,
  mockAdminCompanies,
} from "@/server/db/mock/admin-companies"

export const metadata: Metadata = {
  title: "Companies | TOR Match Admin",
  robots: { index: false, follow: false },
}

export default function AdminCompaniesPage() {
  return (
    <CompaniesView stats={companyStats} companies={mockAdminCompanies} />
  )
}
