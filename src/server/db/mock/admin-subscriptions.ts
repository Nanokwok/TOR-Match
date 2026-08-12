export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past-due"
  | "canceled"

export type SubscriptionPlan = "free" | "pro" | "enterprise"

export type AdminSubscription = {
  id: string
  companyName: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  seats: number
  amountBaht: number
  billingCycle: "monthly" | "yearly"
  renewsAt: string
  startedAt: string
}

export const subscriptionStats = {
  mrr: "฿248,000",
  activePaid: "67",
  trial: "9",
  pastDue: "3",
} as const

export const mockSubscriptions: AdminSubscription[] = [
  {
    id: "sub-001",
    companyName: "Smart City Solutions Co., Ltd.",
    plan: "enterprise",
    status: "active",
    seats: 25,
    amountBaht: 45_000,
    billingCycle: "monthly",
    renewsAt: "2026-09-03",
    startedAt: "2025-08-03",
  },
  {
    id: "sub-002",
    companyName: "ByteWorks Public Co., Ltd.",
    plan: "enterprise",
    status: "active",
    seats: 60,
    amountBaht: 98_000,
    billingCycle: "monthly",
    renewsAt: "2026-09-01",
    startedAt: "2024-12-01",
  },
  {
    id: "sub-003",
    companyName: "Digital Multimedia Co., Ltd.",
    plan: "pro",
    status: "active",
    seats: 10,
    amountBaht: 8_900,
    billingCycle: "monthly",
    renewsAt: "2026-08-12",
    startedAt: "2025-11-12",
  },
  {
    id: "sub-004",
    companyName: "CloudBridge Co., Ltd.",
    plan: "pro",
    status: "active",
    seats: 15,
    amountBaht: 12_500,
    billingCycle: "monthly",
    renewsAt: "2026-09-22",
    startedAt: "2025-06-22",
  },
  {
    id: "sub-005",
    companyName: "Pixel Lab Co., Ltd.",
    plan: "pro",
    status: "trialing",
    seats: 5,
    amountBaht: 0,
    billingCycle: "monthly",
    renewsAt: "2026-08-15",
    startedAt: "2026-08-01",
  },
  {
    id: "sub-006",
    companyName: "Nexus Software Co., Ltd.",
    plan: "pro",
    status: "past-due",
    seats: 12,
    amountBaht: 10_900,
    billingCycle: "monthly",
    renewsAt: "2026-07-19",
    startedAt: "2025-03-19",
  },
  {
    id: "sub-007",
    companyName: "CodeCraft Partnership Ltd.",
    plan: "free",
    status: "active",
    seats: 3,
    amountBaht: 0,
    billingCycle: "monthly",
    renewsAt: "2026-09-28",
    startedAt: "2026-07-28",
  },
  {
    id: "sub-008",
    companyName: "Atom IT Co., Ltd.",
    plan: "free",
    status: "canceled",
    seats: 2,
    amountBaht: 0,
    billingCycle: "monthly",
    renewsAt: "2026-06-09",
    startedAt: "2026-01-09",
  },
]

export const subscriptionPlanLabels: Record<SubscriptionPlan, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
}

export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  active: "Active",
  trialing: "Trialing",
  "past-due": "Past due",
  canceled: "Canceled",
}
