export type OverviewActivityType = "review" | "company" | "subscription"

export type OverviewActivity = {
  id: string
  type: OverviewActivityType
  title: string
  detail: string
  at: string
}

export type OverviewScrapeJob = {
  id: string
  documentSource: string
  sourceUrl?: string
  stage: string
  status: "running" | "success" | "failure" | "skipped"
  errorMessage?: string
  pages: number
  attempts: number
  createdAt: string
  finishedAt?: string | null
}

export type PipelineHealth = {
  totalJobs: number
  successfulJobs: number
  failedJobs: number
  runningJobs: number
  successRatePercent: number
}

export type AdminOverviewStats = {
  activeCompanies: number
  pendingCompanies: number
  torsNeedReview: number
}

export type AdminOverviewData = {
  stats: AdminOverviewStats
  activity: OverviewActivity[]
  pipelineHealth?: PipelineHealth
  recentJobs?: OverviewScrapeJob[]
}
