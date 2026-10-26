import type { Request, Response } from "express"

import { Notification } from "@/models/Notification.model"
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

export type AdminOverview = {
  torsNeedReview: number
  trend: OverviewTrendPoint[]
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

  const [torsNeedReview, torsByDay, matchesByDay] = await Promise.all([
    TorDraft.countDocuments({ reviewStatus: "need-review" }),
    countByDay(Tor, {}, since),
    // "Matches" is the system telling a company it now qualifies for a TOR —
    // a WorkspaceCard would instead count someone bookmarking one, which is
    // the user's action rather than the pipeline's output.
    countByDay(Notification, { category: "match" }, since),
  ])

  const overview: AdminOverview = {
    torsNeedReview,
    trend: days.map((date) => ({
      date,
      tors: torsByDay.get(date) ?? 0,
      matches: matchesByDay.get(date) ?? 0,
    })),
  }

  res.status(200).json(overview)
})
