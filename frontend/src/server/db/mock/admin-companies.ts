export type AdminCompanyStatus = "active" | "pending" | "suspended"

export type AdminCompanyPlan = "free" | "pro" | "enterprise"

export type AdminCompanySize = "micro" | "small" | "medium" | "large"

export type AdminCompanyListItem = {
  id: string
  nameThai: string
  nameEnglish: string
  taxId: string
  contactEmail: string
  phone: string
  size: AdminCompanySize
  plan: AdminCompanyPlan
  status: AdminCompanyStatus
  registeredCapitalBaht: number
  egpRegistered: boolean
  memberCount: number
  joinedAt: string
}

export type AdminCompanyDetail = AdminCompanyListItem & {
  address: string
  specializations: string[]
  certifications: string[]
  lastLoginAt: string
}

export const companyStats = {
  total: "128",
  active: "104",
  pending: "11",
  suspended: "13",
} as const

export const mockAdminCompanies: AdminCompanyListItem[] = [
  {
    id: "co-001",
    nameThai: "บริษัท ดิจิทัล มัลติมีเดีย จำกัด",
    nameEnglish: "Digital Multimedia Co., Ltd.",
    taxId: "0105565012345",
    contactEmail: "ops@digitalmm.co.th",
    phone: "02-123-4567",
    size: "medium",
    plan: "pro",
    status: "active",
    registeredCapitalBaht: 10_000_000,
    egpRegistered: true,
    memberCount: 8,
    joinedAt: "2025-11-12",
  },
  {
    id: "co-002",
    nameThai: "บริษัท สมาร์ท ซิตี้ โซลูชันส์ จำกัด",
    nameEnglish: "Smart City Solutions Co., Ltd.",
    taxId: "0105565098765",
    contactEmail: "admin@smartcity.th",
    phone: "02-987-6543",
    size: "large",
    plan: "enterprise",
    status: "active",
    registeredCapitalBaht: 50_000_000,
    egpRegistered: true,
    memberCount: 24,
    joinedAt: "2025-08-03",
  },
  {
    id: "co-003",
    nameThai: "ห้างหุ้นส่วนจำกัด โค้ดคราฟต์",
    nameEnglish: "CodeCraft Partnership Ltd.",
    taxId: "0125565001122",
    contactEmail: "hello@codecraft.dev",
    phone: "081-555-0199",
    size: "small",
    plan: "free",
    status: "pending",
    registeredCapitalBaht: 1_000_000,
    egpRegistered: false,
    memberCount: 3,
    joinedAt: "2026-07-28",
  },
  {
    id: "co-004",
    nameThai: "บริษัท เน็กซัส ซอฟต์แวร์ จำกัด",
    nameEnglish: "Nexus Software Co., Ltd.",
    taxId: "0105565112233",
    contactEmail: "contact@nexussoft.io",
    phone: "02-441-2200",
    size: "medium",
    plan: "pro",
    status: "suspended",
    registeredCapitalBaht: 5_000_000,
    egpRegistered: true,
    memberCount: 12,
    joinedAt: "2025-03-19",
  },
  {
    id: "co-005",
    nameThai: "บริษัท อะตอม ไอที จำกัด",
    nameEnglish: "Atom IT Co., Ltd.",
    taxId: "0105565223344",
    contactEmail: "team@atomit.co.th",
    phone: "02-330-8899",
    size: "micro",
    plan: "free",
    status: "active",
    registeredCapitalBaht: 500_000,
    egpRegistered: true,
    memberCount: 2,
    joinedAt: "2026-01-09",
  },
  {
    id: "co-006",
    nameThai: "บริษัท ไบต์เวิร์ค จำกัด (มหาชน)",
    nameEnglish: "ByteWorks Public Co., Ltd.",
    taxId: "0107555004455",
    contactEmail: "enterprise@byteworks.com",
    phone: "02-777-0101",
    size: "large",
    plan: "enterprise",
    status: "active",
    registeredCapitalBaht: 100_000_000,
    egpRegistered: true,
    memberCount: 56,
    joinedAt: "2024-12-01",
  },
  {
    id: "co-007",
    nameThai: "บริษัท พิกเซล แล็บ จำกัด",
    nameEnglish: "Pixel Lab Co., Ltd.",
    taxId: "0105565335566",
    contactEmail: "hi@pixellab.th",
    phone: "089-222-3344",
    size: "small",
    plan: "pro",
    status: "pending",
    registeredCapitalBaht: 2_000_000,
    egpRegistered: false,
    memberCount: 5,
    joinedAt: "2026-08-01",
  },
  {
    id: "co-008",
    nameThai: "บริษัท คลาวด์บริดจ์ จำกัด",
    nameEnglish: "CloudBridge Co., Ltd.",
    taxId: "0105565446677",
    contactEmail: "support@cloudbridge.app",
    phone: "02-555-7788",
    size: "medium",
    plan: "pro",
    status: "active",
    registeredCapitalBaht: 8_000_000,
    egpRegistered: true,
    memberCount: 15,
    joinedAt: "2025-06-22",
  },
]

const detailExtras: Record<
  string,
  Pick<
    AdminCompanyDetail,
    "address" | "specializations" | "certifications" | "lastLoginAt"
  >
> = {
  "co-001": {
    address: "88 Rama IX Rd, Huai Khwang, Bangkok 10310",
    specializations: ["Software Development", "Data & AI"],
    certifications: ["ISO 27001", "ISO 9001"],
    lastLoginAt: "2026-08-11T08:20:00+07:00",
  },
  "co-002": {
    address: "199 Sukhumvit 21, Watthana, Bangkok 10110",
    specializations: ["System Maintenance", "Mobile App"],
    certifications: ["ISO 27001", "CMMI Level 2"],
    lastLoginAt: "2026-08-10T16:05:00+07:00",
  },
}

export function getAdminCompanyById(id: string): AdminCompanyDetail | null {
  const item = mockAdminCompanies.find((company) => company.id === id)
  if (!item) return null

  const extras = detailExtras[id] ?? {
    address: "—",
    specializations: ["Software Development"],
    certifications: item.egpRegistered ? ["e-GP Registered"] : [],
    lastLoginAt: `${item.joinedAt}T09:00:00+07:00`,
  }

  return { ...item, ...extras }
}

export const companySizeLabels: Record<AdminCompanySize, string> = {
  micro: "Micro",
  small: "Small",
  medium: "Medium",
  large: "Large",
}

export const companyPlanLabels: Record<AdminCompanyPlan, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
}

export const companyStatusLabels: Record<AdminCompanyStatus, string> = {
  active: "Active",
  pending: "Pending",
  suspended: "Suspended",
}
