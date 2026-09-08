import type { LocalizedText } from "@/types/localized"

export type DashboardMetric = {
  id: "active-bids" | "upcoming-deadlines"
  label: string
  value: number
  description: string
}

export type DashboardRecommendedTor = {
  id: string
  title: LocalizedText
  department: LocalizedText
  localOffice: LocalizedText
  budgetBaht: number
  deadline: string
  projectScale: string
  matchScore: number
}

export type MonthlyTorTrendPoint = {
  monthKey: string
  label: string
  announcementCount: number
  budgetBaht: number
}

export type DistrictDistributionPoint = {
  district: string
  projectCount: number
  budgetBaht: number
}

export type DashboardData = {
  metrics: DashboardMetric[]
  recommendedTors: DashboardRecommendedTor[]
  monthlyTrend: MonthlyTorTrendPoint[]
  districtDistribution: DistrictDistributionPoint[]
}
