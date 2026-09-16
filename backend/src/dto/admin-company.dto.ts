import { Types } from "mongoose"

import {
  COMPANY_SIZES,
  COMPANY_STATUSES,
  type CompanyDoc,
  type CompanySize,
  type CompanyStatus,
} from "@/models/Company.model"

export type AdminCompanyListItem = {
  id: string
  nameThai: string
  nameEnglish: string
  taxId: string
  contactEmail: string
  phone: string
  size: CompanySize | ""
  status: CompanyStatus
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

function parseCapitalBaht(value: string): number {
  const n = Number(String(value).replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) ? n : 0
}

function mapSize(value: string): CompanySize | "" {
  return (COMPANY_SIZES as readonly string[]).includes(value)
    ? (value as CompanySize)
    : ""
}

function mapStatus(value: unknown): CompanyStatus {
  if ((COMPANY_STATUSES as readonly string[]).includes(value as string)) {
    return value as CompanyStatus
  }
  return "active"
}

export function toAdminCompanyListItem(
  company: CompanyDoc,
  memberCount: number
): AdminCompanyListItem {
  return {
    id: String(company._id),
    nameThai: company.companyNameThai ?? "",
    nameEnglish: company.companyNameEnglish ?? "",
    taxId: company.taxId ?? "",
    contactEmail: company.contactEmail ?? "",
    phone: company.phone ?? "",
    size: mapSize(company.companySize ?? ""),
    status: mapStatus(company.status),
    registeredCapitalBaht: parseCapitalBaht(company.registeredCapitalThb ?? ""),
    egpRegistered: company.egpStatus === "registered",
    memberCount,
    joinedAt: company.createdAt
      ? new Date(company.createdAt).toISOString()
      : new Date(0).toISOString(),
  }
}

export function toAdminCompanyDetail(
  company: CompanyDoc,
  memberCount: number
): AdminCompanyDetail {
  return {
    ...toAdminCompanyListItem(company, memberCount),
    specializations: company.specializations ?? [],
    certifications: (company.certifications ?? [])
      .filter((cert) => cert.selected)
      .map((cert) => cert.id),
  }
}

export function isObjectIdString(value: string): boolean {
  return Types.ObjectId.isValid(value) && String(new Types.ObjectId(value)) === value
}
