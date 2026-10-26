import { digestDue, type DigestKind } from "@/domain/digest-schedule"
import { renderDailyDigest, renderWeeklySummary, type DigestTor } from "@/domain/digest-email"
import { env } from "@/config/env"
import { Company, type CompanyDoc } from "@/models/Company.model"
import { DigestRun } from "@/models/DigestRun.model"
import { NotificationSettings } from "@/models/NotificationSettings.model"
import { Tor, type TorDoc } from "@/models/Tor.model"
import { User } from "@/models/User.model"
import { WorkspaceCard } from "@/models/WorkspaceCard.model"
import { currentSender, sendEmail } from "@/services/email.service"
import { emailRecipient, torName } from "@/services/match-notification.service"
import { matchCompanyToTor } from "@/services/qualification.service"
import { isOpenForBids } from "@/utils/tor-listing"
import { parseThaiDateTime } from "@/utils/thai-time"

/**
 * Daily and weekly digest emails, sent at the time each user chose in
 * /settings/notifications. A user who never opened that screen gets the
 * defaults shown there (daily 08:00, weekly Monday 09:00); the master email
 * switch turns both off. Only users with a company profile get one, since both
 * emails are about how TORs fit that profile.
 */

const DAY_MS = 24 * 60 * 60 * 1000

type SettingsLean = {
  userId: unknown
  emailEnabled?: boolean
  emailRecipient?: string
  dailyDigestEnabled?: boolean
  dailyDigestTime?: string
  weeklyDigestEnabled?: boolean
  weeklyDigestDay?: string
  weeklyDigestTime?: string
}

const deadlineText = (tor: { deadline?: string }) => {
  const date = parseThaiDateTime(tor.deadline)
  return date
    ? date.toLocaleString("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })
    : ""
}

function toDigestTor(tor: TorDoc): DigestTor {
  return {
    id: String(tor._id),
    titleTh: torName(tor, "th"),
    titleEn: torName(tor, "en"),
    department: tor.department.en || tor.department.th,
    budgetBaht: tor.budgetBaht,
    deadline: deadlineText(tor),
  }
}

/** Takes the right to send this digest. False when it already went out (or another run is sending it now). */
async function claim(userId: unknown, kind: DigestKind, periodKey: string): Promise<boolean> {
  try {
    await DigestRun.create({ userId, kind, periodKey })
    return true
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return false
    throw error
  }
}

const fitsProfile = (company: CompanyDoc, tor: TorDoc) => matchCompanyToTor(company, tor).status !== "failed"

export type DigestRunOptions = {
  now?: Date
  /** Send to this one account right now, ignoring the schedule and the once-a-day record. For trying it out. */
  force?: { email: string }
}

export async function sendDueDigests(options: DigestRunOptions = {}): Promise<{ daily: number; weekly: number }> {
  const now = options.now ?? new Date()
  const companies = await Company.find()
  if (!companies.length) return { daily: 0, weekly: 0 }

  const ownerIds = companies.map((company) => company.ownerId)
  const [settingsDocs, users, sender] = await Promise.all([
    NotificationSettings.find({ userId: { $in: ownerIds } }).lean(),
    User.find({ _id: { $in: ownerIds } }).select("email").lean(),
    currentSender(),
  ])
  const settingsByUser = new Map(settingsDocs.map((doc) => [String(doc.userId), doc as unknown as SettingsLean]))
  const emailByUser = new Map(users.map((user) => [String(user._id), user.email]))

  const [newToday, newThisWeek, openTors] = await Promise.all([
    Tor.find({ createdAt: { $gte: new Date(now.getTime() - DAY_MS) } }),
    Tor.find({ createdAt: { $gte: new Date(now.getTime() - 7 * DAY_MS) } }),
    Tor.find({ status: { $in: ["open", "closing-soon"] } }),
  ])
  const torsById = new Map(openTors.map((tor) => [String(tor._id), tor]))

  const sent = { daily: 0, weekly: 0 }

  for (const company of companies) {
    const userId = String(company.ownerId)
    const settings = settingsByUser.get(userId) ?? null
    const accountEmail = emailByUser.get(userId)
    if (options.force && accountEmail?.toLowerCase() !== options.force.email.toLowerCase()) continue
    if (settings?.emailEnabled === false) continue
    const to = emailRecipient(settings, accountEmail)
    if (!to) continue

    const attempt = async (kind: DigestKind, enabled: boolean, time: string, weekday: string | undefined, build: () => Promise<ReturnType<typeof renderDailyDigest> | null>) => {
      if (!options.force) {
        if (!enabled) return
        const { due, periodKey } = digestDue({ kind, time, weekday, now })
        if (!due) return
        if (!(await claim(company.ownerId, kind, periodKey))) return
        // Past this point the period is spoken for; release it if nothing goes out because of a failure.
        try {
          const mail = await build()
          if (!mail) return
          await sendEmail({ to, ...mail }, sender)
          sent[kind] += 1
        } catch (error) {
          await DigestRun.deleteOne({ userId: company.ownerId, kind, periodKey })
          console.error(`[digest] ${kind} digest for ${to} failed`, error)
        }
        return
      }
      const mail = await build()
      if (!mail) return
      await sendEmail({ to, ...mail }, sender)
      sent[kind] += 1
    }

    await attempt(
      "daily",
      settings?.dailyDigestEnabled ?? true,
      settings?.dailyDigestTime ?? "08:00",
      undefined,
      async () => {
        const fitting = newToday.filter((tor) => isOpenForBids(tor, now) && fitsProfile(company, tor))
        return fitting.length ? renderDailyDigest(fitting.map(toDigestTor), env.appUrl) : null
      }
    )

    await attempt(
      "weekly",
      settings?.weeklyDigestEnabled ?? true,
      settings?.weeklyDigestTime ?? "09:00",
      settings?.weeklyDigestDay ?? "monday",
      async () => {
        const cards = await WorkspaceCard.find({ ownerId: company.ownerId })
        const columns: Record<string, number> = {}
        for (const card of cards) columns[card.column] = (columns[card.column] ?? 0) + 1

        const horizon = now.getTime() + 7 * DAY_MS
        const closingSoon = cards
          .filter((card) => card.column !== "done")
          .map((card) => torsById.get(String(card.torId)))
          .filter((tor): tor is TorDoc => Boolean(tor))
          .map((tor) => ({ tor, at: parseThaiDateTime(tor.deadline)?.getTime() ?? null }))
          .filter((entry): entry is { tor: TorDoc; at: number } => entry.at !== null && entry.at > now.getTime() && entry.at <= horizon)
          .sort((a, b) => a.at - b.at)
          .map((entry) => toDigestTor(entry.tor))

        const newMatches = newThisWeek.filter((tor) => isOpenForBids(tor, now) && fitsProfile(company, tor)).length
        if (!cards.length && !newMatches) return null
        return renderWeeklySummary({ columns, closingSoon, newMatches }, env.appUrl)
      }
    )
  }

  return sent
}

let timer: NodeJS.Timeout | undefined

/**
 * Checks every 15 minutes for digests that have come due. The once-a-day
 * record makes it safe to run on several instances or after a restart.
 */
export function startDigestScheduler(): void {
  if (timer) return
  const run = () =>
    sendDueDigests().catch((error) => console.error("[digest] run failed", error))
  setTimeout(run, 20_000).unref()
  timer = setInterval(run, 15 * 60 * 1000)
  timer.unref()
}
