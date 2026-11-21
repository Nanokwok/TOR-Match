export type OverviewActivityType = "review" | "company" | "subscription"

export type OverviewActivity = {
  id: string
  type: OverviewActivityType
  title: string
  detail: string
  at: string
}

export type AdminOverviewStats = {
  activeCompanies: number
  pendingCompanies: number
  torsNeedReview: number
}

export type AdminOverviewData = {
  stats: AdminOverviewStats
  activity: OverviewActivity[]
}
