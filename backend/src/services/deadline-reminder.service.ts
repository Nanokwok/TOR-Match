import { Tor, type TorDoc } from "@/models/Tor.model"
import { WorkspaceCard } from "@/models/WorkspaceCard.model"
import {
  deliver,
  torName,
  type NewNotification,
  type NotificationEvent,
} from "@/services/match-notification.service"

type DeadlineEvent = Extract<NotificationEvent, "deadline-7-day" | "deadline-3-day" | "deadline-24-hour">

const HOUR_MS = 60 * 60 * 1000

/**
 * Pure: which reminder a TOR is due, given how long is left. Only the tightest
 * window applies, so a TOR first seen with two days to go gets the 3-day
 * reminder and never a stale 7-day one — and each window fires once per user
 * and TOR (see the dedupeKey), however often the job runs.
 */
export function reminderWindowFor(hoursLeft: number): DeadlineEvent | null {
  if (!(hoursLeft > 0)) return null
  if (hoursLeft <= 24) return "deadline-24-hour"
  if (hoursLeft <= 72) return "deadline-3-day"
  if (hoursLeft <= 168) return "deadline-7-day"
  return null
}

/**
 * Pure: a stored deadline as a Date. The review form stores local wall-clock
 * text with no offset, and these are Thai government deadlines, so an offset-
 * less value means Bangkok time — not whatever zone the server happens to run
 * in. A bare date closes at the end of that day.
 */
export function parseDeadline(value: string | undefined | null): Date | null {
  const text = value?.trim()
  if (!text) return null
  const withZone = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T23:59:00+07:00`
    : /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(text)
      ? `${text}+07:00`
      : text
  const date = new Date(withZone)
  return Number.isNaN(date.getTime()) ? null : date
}

const bangkokTime = (date: Date, locale: "en-GB" | "th-TH") =>
  date.toLocaleString(locale, {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  })

function buildReminder(userId: unknown, tor: TorDoc, event: DeadlineEvent, deadline: Date): NewNotification {
  const wording = {
    "deadline-24-hour": {
      en: "Final call: closes within 24 hours",
      th: "เตือนครั้งสุดท้าย: ปิดรับภายใน 24 ชั่วโมง",
    },
    "deadline-3-day": {
      en: "Closes within 3 days",
      th: "ปิดรับภายใน 3 วัน",
    },
    "deadline-7-day": {
      en: "Closes within 7 days",
      th: "ปิดรับภายใน 7 วัน",
    },
  }[event]
  return {
    userId,
    category: "deadline",
    torId: tor._id,
    dedupeKey: `${event}:${userId}:${tor._id}`,
    link: `/browse?tor=${tor._id}`,
    action: "view-tor",
    title: {
      en: `${wording.en}: ${torName(tor, "en")}`,
      th: `${wording.th}: ${torName(tor, "th")}`,
    },
    description: {
      en: `Submission deadline: ${bangkokTime(deadline, "en-GB")} (Bangkok time).`,
      th: `กำหนดยื่นข้อเสนอ: ${bangkokTime(deadline, "th-TH")} (เวลาประเทศไทย)`,
    },
  }
}

/**
 * Reminds each user whose workspace holds a TOR that its bid deadline is
 * close. Run it on a schedule (hourly is plenty); it is safe to run as often
 * as you like because every window alerts once per user and TOR.
 * Cards the user already moved to "done" are skipped.
 */
export async function notifyDeadlineReminders(now = new Date()): Promise<number> {
  const tors = await Tor.find({ status: { $in: ["open", "closing-soon"] }, deadline: { $ne: "" } })

  const due = new Map<string, { tor: TorDoc; event: DeadlineEvent; deadline: Date }>()
  for (const tor of tors) {
    const deadline = parseDeadline(tor.deadline)
    if (!deadline) continue
    const event = reminderWindowFor((deadline.getTime() - now.getTime()) / HOUR_MS)
    if (event) due.set(String(tor._id), { tor, event, deadline })
  }
  if (!due.size) return 0

  const cards = await WorkspaceCard.find({
    torId: { $in: [...due.values()].map((entry) => entry.tor._id) },
    column: { $ne: "done" },
  }).select("ownerId torId")

  const byEvent = new Map<DeadlineEvent, NewNotification[]>()
  for (const card of cards) {
    const entry = due.get(String(card.torId))
    if (!entry) continue
    const list = byEvent.get(entry.event) ?? []
    list.push(buildReminder(card.ownerId, entry.tor, entry.event, entry.deadline))
    byEvent.set(entry.event, list)
  }

  for (const [event, notifications] of byEvent) await deliver(event, notifications)
  return cards.length
}

let timer: NodeJS.Timeout | undefined

/**
 * Runs the reminder job now and then hourly for as long as the server lives.
 * Several instances are harmless — the dedupe keys keep them from doubling up.
 */
export function startDeadlineReminderScheduler(): void {
  if (timer) return
  const run = () =>
    notifyDeadlineReminders().catch((error) => console.error("[deadline-reminders] failed", error))
  setTimeout(run, 15_000).unref()
  timer = setInterval(run, HOUR_MS)
  timer.unref()
}
