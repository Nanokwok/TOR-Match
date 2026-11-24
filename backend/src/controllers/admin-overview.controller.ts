import type { Request, Response } from "express"

import { Company } from "@/models/Company.model"
import { ScrapeJob } from "@/models/ScrapeJob.model"
import { TorDraft } from "@/models/TorDraft.model"
import { asyncHandler } from "@/utils/asyncHandler"

export type OverviewActivityType = "review" | "company"

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

export type AdminOverviewResponse = {
  stats: {
    activeCompanies: number
    pendingCompanies: number
    torsNeedReview: number
  }
  activity: OverviewActivity[]
  pipelineHealth: PipelineHealth
  recentJobs: OverviewScrapeJob[]
}

type DraftActivityInput = {
  _id: unknown
  announcementNo?: string | null
  title?: { en?: string | null; th?: string | null } | null
  aiConfidence?: number | null
  reviewStatus?: string | null
  createdAt?: Date | null
  updatedAt?: Date | null
  publishedAt?: Date | null
}

type CompanyActivityInput = {
  _id: unknown
  companyNameEnglish?: string | null
  companyNameThai?: string | null
  status?: string | null
  createdAt?: Date | null
  updatedAt?: Date | null
}

export function toDraftActivity(draft: DraftActivityInput): OverviewActivity {
  const title =
    draft.reviewStatus === "auto-approved"
      ? "TOR auto-approved"
      : draft.reviewStatus === "approved"
        ? "TOR approved"
        : "TOR marked Need Review"

  const titleText = draft.title?.en || draft.title?.th || ""
  const shortTitle = titleText.length > 40 ? `${titleText.slice(0, 40)}...` : titleText
  const detailParts = [draft.announcementNo, shortTitle, `AI confidence ${draft.aiConfidence ?? 0}%`].filter(Boolean)

  const dateVal = draft.publishedAt || draft.updatedAt || draft.createdAt || new Date()
  return {
    id: `draft-${String(draft._id)}`,
    type: "review",
    title,
    detail: detailParts.join(" · "),
    at: new Date(dateVal).toISOString(),
  }
}

export function toCompanyActivity(company: CompanyActivityInput): OverviewActivity {
  const companyName = company.companyNameEnglish || company.companyNameThai || "Company"
  const isPending = company.status === "pending"
  return {
    id: `company-${String(company._id)}`,
    type: "company",
    title: isPending ? "New company signup" : "Company registered",
    detail: `${companyName} (${isPending ? "awaiting approval" : company.status || "active"})`,
    at: new Date(company.createdAt || new Date()).toISOString(),
  }
}

export function mergeAndSortActivities(
  draftActivities: OverviewActivity[],
  companyActivities: OverviewActivity[],
  limit = 10
): OverviewActivity[] {
  return [...draftActivities, ...companyActivities]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

export const getAdminOverview = asyncHandler(async (_req: Request, res: Response) => {
  const [
    activeCompanies,
    pendingCompanies,
    torsNeedReview,
    recentDrafts,
    recentCompanies,
    totalJobs,
    successfulJobs,
    failedJobs,
    runningJobs,
    recentScrapeDocs,
  ] = await Promise.all([
    Company.countDocuments({ status: "active" }),
    Company.countDocuments({ status: "pending" }),
    TorDraft.countDocuments({ reviewStatus: "need-review" }),
    TorDraft.find({})
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("announcementNo title aiConfidence reviewStatus createdAt updatedAt publishedAt")
      .lean(),
    Company.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select("companyNameEnglish companyNameThai status createdAt updatedAt")
      .lean(),
    ScrapeJob.countDocuments({}),
    ScrapeJob.countDocuments({ status: "success" }),
    ScrapeJob.countDocuments({ status: "failure" }),
    ScrapeJob.countDocuments({ status: "running" }),
    ScrapeJob.find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
  ])

  const draftActivities = recentDrafts.map(toDraftActivity)
  const companyActivities = recentCompanies.map(toCompanyActivity)
  const mergedActivity = mergeAndSortActivities(draftActivities, companyActivities, 10)

  const finishedTotal = successfulJobs + failedJobs
  const successRatePercent = finishedTotal > 0 ? Math.round((successfulJobs / finishedTotal) * 100) : 100

  const recentJobs: OverviewScrapeJob[] = recentScrapeDocs.map((job) => ({
    id: String(job._id),
    documentSource: job.documentSource,
    sourceUrl: job.sourceUrl || undefined,
    stage: job.stage,
    status: (job.status as OverviewScrapeJob["status"]) || "running",
    errorMessage: job.errorMessage || undefined,
    pages: job.pages ?? 0,
    attempts: job.attempts ?? 1,
    createdAt: new Date(job.createdAt || new Date()).toISOString(),
    finishedAt: job.finishedAt ? new Date(job.finishedAt).toISOString() : null,
  }))

  const response: AdminOverviewResponse = {
    stats: {
      activeCompanies,
      pendingCompanies,
      torsNeedReview,
    },
    activity: mergedActivity,
    pipelineHealth: {
      totalJobs,
      successfulJobs,
      failedJobs,
      runningJobs,
      successRatePercent,
    },
    recentJobs,
  }

  res.status(200).json(response)
})
