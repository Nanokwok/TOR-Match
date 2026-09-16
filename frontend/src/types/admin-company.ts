export type AdminCompanyStatus = "active" | "pending" | "suspended"

export type AdminCompanySize = "micro" | "small" | "medium" | "large"

export type AdminCompanyListItem = {
  id: string
  nameThai: string
  nameEnglish: string
  taxId: string
  contactEmail: string
  phone: string
  size: AdminCompanySize | ""
  status: AdminCompanyStatus
  registeredCapitalBaht: number
  egpRegistered: boolean
  memberCount: number
  joinedAt: string
}

export type AdminCompanyDetail = AdminCompanyListItem & {
  specializations: string[]
  certifications: string[]
}

export type AdminCompanyStats = {
  total: number
  active: number
  pending: number
  suspended: number
}

export type AdminCompanyListResult = {
  items: AdminCompanyListItem[]
  page: number
  limit: number
  total: number
}

export const companySizeLabels: Record<AdminCompanySize, string> = {
  micro: "Micro",
  small: "Small",
  medium: "Medium",
  large: "Large",
}

export const companyStatusLabels: Record<AdminCompanyStatus, string> = {
  active: "Active",
  pending: "Pending",
  suspended: "Suspended",
}

export function formatCompanySize(size: AdminCompanySize | ""): string {
  return size ? companySizeLabels[size] : "—"
}
