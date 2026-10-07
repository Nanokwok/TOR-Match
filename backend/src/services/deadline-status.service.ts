import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import { parseDeadline } from "@/services/deadline-reminder.service"

/**
 * Moves a TOR's status along as its deadline passes.
 *
 * Status otherwise comes only from which announcement was published — D0 means
 * open, D1 cancelled, W0 awarded — which is right for everything an agency
 * tells us but silent about the one thing it never announces: that the
 * submission window simply ran out. An agency publishes its ประกาศผู้ชนะ weeks
 * after bidding closes, and for a project that attracted no bidder it may never
 * publish one at all.
 *
 * That was survivable while ingestion only ever saw the last day or two of the
 * feed. Walking `announceDate` back a month brought in invitations whose
 * bidding had already closed, and they went straight to /browse reading
 * "เปิดรับซองข้อเสนอ" — advertising work nobody could bid for, and feeding
 * match notifications for it, because BIDDABLE_STATUSES counts `open`.
 */

/**
 * The statuses a passing deadline may change.
 *
 * Deliberately not the terminal ones: a cancelled or awarded project has an
 * outcome the agency published, and a date cannot overrule it. `changed` is
 * included because D2 เปลี่ยนแปลงประกาศเชิญชวน leaves the bidding open — so its
 * window runs out like any other.
 */
export const AGEING_STATUSES = ["open", "closing-soon", "changed"] as const

/**
 * How close to the deadline counts as closing soon. Seven days, matching the
 * first reminder window (reminderWindowFor) and the frontend's "warning"
 * urgency band, so a bidder is not told three different things about the same
 * TOR.
 */
export const CLOSING_SOON_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Pure: the status a deadline implies, or null to leave the TOR alone.
 *
 * Null covers every case where there is nothing to say: a status a date must
 * not touch, no deadline recorded, an unparseable one, and — importantly — a
 * TOR already carrying the status this would set, so a repeated run writes
 * nothing.
 */
export function statusForDeadline(
  deadline: string | undefined | null,
  current: string | undefined,
  now: Date = new Date()
): "closing-soon" | "closed" | null {
  if (!current || !AGEING_STATUSES.includes(current as (typeof AGEING_STATUSES)[number])) return null

  const at = parseDeadline(deadline)
  if (!at) return null

  const msLeft = at.getTime() - now.getTime()
  const next = msLeft <= 0 ? "closed" : msLeft <= CLOSING_SOON_DAYS * DAY_MS ? "closing-soon" : null

  return next && next !== current ? next : null
}

export type AgeingChange = {
  announcementNo: string
  from: string
  to: "closing-soon" | "closed"
  deadline: string
}

/**
 * Applies {@link statusForDeadline} to every published TOR, and to the draft
 * behind it so the two do not disagree — the admin screen reads the draft.
 *
 * Drafts without a published TOR are left alone: they are not visible to a
 * bidder, and the next ingest decides their status from the announcements.
 */
export async function ageStatuses({
  dryRun = false,
  now = new Date(),
}: { dryRun?: boolean; now?: Date } = {}): Promise<AgeingChange[]> {
  const tors = await Tor.find(
    { status: { $in: AGEING_STATUSES } },
    { announcementNo: 1, status: 1, deadline: 1 }
  ).lean()

  const changes: AgeingChange[] = []
  for (const tor of tors) {
    const to = statusForDeadline(tor.deadline, tor.status, now)
    if (!to) continue
    changes.push({
      announcementNo: tor.announcementNo,
      from: tor.status ?? "",
      to,
      deadline: tor.deadline ?? "",
    })
  }

  if (dryRun || !changes.length) return changes

  // Grouped into one write per target status rather than one per TOR: a month
  // of backfilled invitations closes in a single run.
  for (const to of ["closing-soon", "closed"] as const) {
    const announcementNos = changes.filter((change) => change.to === to).map((change) => change.announcementNo)
    if (!announcementNos.length) continue
    await Promise.all([
      Tor.updateMany({ announcementNo: { $in: announcementNos } }, { $set: { status: to } }),
      TorDraft.updateMany({ announcementNo: { $in: announcementNos } }, { $set: { status: to } }),
    ])
  }

  return changes
}
