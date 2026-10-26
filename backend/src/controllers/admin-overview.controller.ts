import type { Request, Response } from "express"

import { Company } from "@/models/Company.model"
import { Notification } from "@/models/Notification.model"
import { ScrapeJob } from "@/models/ScrapeJob.model"
import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import { asyncHandler } from "@/utils/asyncHandler"

/**
 * The numbers behind /admin/overview.
 *
 * Counted here rather than on the page because the admin screen reaches the
 * backend through an API token and has no database of its own — and because a
 * dashboard that disagrees with the review queue is worse than no dashboard:
 * it was reading 18 waiting while the queue held 2.
 */

/** Days the trend covers, today included. */
export const TREND_DAYS = 7

/**
 * Grouped by Bangkok date, not the server's.
 *
 * The audience and the procurement day both run on Thai time, so a container
 * in UTC must not cut the day at 07:00 local and split one afternoon's work
 * across two columns.
 */
const TIMEZONE = "Asia/Bangkok"

export type OverviewTrendPoint = {
  /** YYYY-MM-DD in Bangkok time; the client decides how to label it. */
  date: string
  tors: number
  matches: number
}

/**
 * What the activity feed can honestly report.
 *
 * Built from records that are written once, when the thing happened: a
 * ScrapeJob row per extraction, a Company row per signup. Deliberately not
 * from `updatedAt` on a draft — a maintenance script that touches every row
 * moves 237 of them to the same minute, and the feed would announce hundreds
 * of reviews that never took place.
 *
 * That also sets the limit: these say what the pipeline did, not what a
 * reviewer did. "Approved by whom, and when" needs a record written at the
 * moment of approval, which nothing writes yet.
 */
export type OverviewActivityType = "ingest" | "company"

export type OverviewActivity = {
  id: string
  type: OverviewActivityType
  title: string
  detail: string
  /** ISO 8601. */
  at: string
}

export type AdminOverview = {
  torsNeedReview: number
  trend: OverviewTrendPoint[]
  activity: OverviewActivity[]
}

/** How many rows the feed shows. */
const ACTIVITY_LIMIT = 8

const JOB_TITLES: Record<string, string> = {
  success: "TOR extracted",
  failure: "Extraction failed",
  running: "Extraction running",
  skipped: "Announcement skipped",
}

/** First sentence of an error, short enough to sit on one line. */
function shorten(message: string, max = 90): string {
  const text = message.trim().replace(/\s+/g, " ")
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

async function recentActivity(): Promise<OverviewActivity[]> {
  const [jobs, companies] = await Promise.all([
    ScrapeJob.find({}, { documentSource: 1, status: 1, pages: 1, errorMessage: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT)
      .lean(),
    Company.find({}, { companyNameThai: 1, companyNameEnglish: 1, status: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT)
      .lean(),
  ])

  const fromJobs = jobs.map((job): OverviewActivity => {
    const status = String(job.status ?? "running")
    const detail =
      status === "failure" && job.errorMessage
        ? `${job.documentSource} · ${shorten(job.errorMessage)}`
        : job.pages
          ? `${job.documentSource} · ${job.pages} document(s)`
          : String(job.documentSource)
    return {
      id: `job-${String(job._id)}`,
      type: "ingest",
      title: JOB_TITLES[status] ?? "Extraction",
      detail,
      at: new Date(job.createdAt as unknown as Date).toISOString(),
    }
  })

  const fromCompanies = companies.map((company): OverviewActivity => {
    // Thai first, as the rest of the product does; English is the fallback
    // for a profile that only filled that side in.
    const name = company.companyNameThai?.trim() || company.companyNameEnglish?.trim() || "Unnamed company"
    return {
      id: `company-${String(company._id)}`,
      type: "company",
      title: "New company signup",
      detail: company.status === "pending" ? `${name} awaiting approval` : `${name} · ${company.status}`,
      at: new Date(company.createdAt as unknown as Date).toISOString(),
    }
  })

  return [...fromJobs, ...fromCompanies]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, ACTIVITY_LIMIT)
}

/** Day keys for the window, oldest first, so empty days still get a column. */
function trendDays(now: Date): string[] {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return Array.from({ length: TREND_DAYS }, (_, index) => {
    const at = new Date(now.getTime() - (TREND_DAYS - 1 - index) * 86_400_000)
    return formatter.format(at)
  })
}

/** One day's counts keyed by date, from a createdAt field. */
async function countByDay(
  model: typeof Tor | typeof Notification,
  match: Record<string, unknown>,
  since: Date
): Promise<Map<string, number>> {
  const rows = await model.aggregate<{ _id: string; count: number }>([
    { $match: { ...match, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d", timezone: TIMEZONE } },
        count: { $sum: 1 },
      },
    },
  ])
  return new Map(rows.map((row) => [row._id, row.count]))
}

export const getAdminOverview = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date()
  const days = trendDays(now)
  // Midnight Bangkok on the oldest day in the window, as an instant.
  const since = new Date(`${days[0]}T00:00:00+07:00`)

  const [torsNeedReview, torsByDay, matchesByDay, activity] = await Promise.all([
    TorDraft.countDocuments({ reviewStatus: "need-review" }),
    countByDay(Tor, {}, since),
    // "Matches" is the system telling a company it now qualifies for a TOR —
    // a WorkspaceCard would instead count someone bookmarking one, which is
    // the user's action rather than the pipeline's output.
    countByDay(Notification, { category: "match" }, since),
    recentActivity(),
  ])

  const overview: AdminOverview = {
    torsNeedReview,
    trend: days.map((date) => ({
      date,
      tors: torsByDay.get(date) ?? 0,
      matches: matchesByDay.get(date) ?? 0,
    })),
    activity,
  }

  res.status(200).json(overview)
})
