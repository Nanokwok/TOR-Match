import type {
  Tor,
  TorAnnouncement,
  TorStepCode,
  TorStepDocument,
  TorStepStatus,
  TorTimeline,
  TorTimelineStep,
} from "@/types/tor"
import { STEP_METADATA, MAIN_STEP_CODES } from "@/lib/tor-timeline-steps"

/**
 * The procurement stepper, built from the announcements e-GP actually
 * published for this project.
 *
 * Every step is one announcement type, and the ingest stores every one it sees
 * (see the backend's announcementLinkSchema), so the stepper needs nothing
 * invented: the dates are publication dates from the feed and the documents are
 * the feed's own links.
 *
 * What it cannot show is an announcement nobody captured. e-GP serves roughly a
 * month of history, so a project whose แผนงาน was published last quarter has no
 * P0 row and its first step renders as not-yet-reached. The alternative — an
 * assumed date — would be worse: a bidder would read it as fact.
 */

export { STEP_METADATA, MAIN_STEP_CODES }

/** The off-trunk announcements, and which main step they hang from. */
const BRANCHES: Record<"D0" | "W0", TorStepCode[]> = {
  // Amendment before cancellation: when a run brings both, the cancellation is
  // the later word and should be rendered last.
  D0: ["D2", "D1"],
  W0: ["W2", "W1"],
}

const CANCELLATIONS = new Set<TorStepCode>(["D1", "W1"])

/**
 * Every type in the order a project passes through it, used to break ties.
 *
 * Two announcements are often published on the same day — a project's ราคากลาง
 * and its ประกาศเชิญชวน routinely share a date. Ordering by date alone then
 * leaves the winner to the order the rows happen to sit in, and picking the
 * earlier stage makes the stepper mark the project as still at the median
 * price while every later step greys out, invitation included.
 */
const LIFECYCLE_RANK: TorStepCode[] = ["P0", "15", "B0", "D0", "D2", "D1", "W0", "W2", "W1"]

function rankOf(announceType: string): number {
  const index = LIFECYCLE_RANK.indexOf(announceType as TorStepCode)
  return index < 0 ? -1 : index
}

/** Newest first, and on the same day the later stage wins. */
function byNewest(rows: readonly TorAnnouncement[]): TorAnnouncement[] {
  return [...rows].sort((a, b) => {
    const byDate = (b.publishedDate ?? "").localeCompare(a.publishedDate ?? "")
    return byDate !== 0 ? byDate : rankOf(b.announceType) - rankOf(a.announceType)
  })
}

function rowsFor(announcements: readonly TorAnnouncement[], code: TorStepCode): TorAnnouncement[] {
  return byNewest(announcements.filter((row) => row.announceType === code))
}

/**
 * Whole days from now until `deadline`, or null when it has passed or is
 * unreadable. Null rather than a negative number: the stepper renders this as
 * "เหลือ N วัน", which must never count down into the past.
 */
function daysUntil(deadline: string | undefined, now: Date): number | null {
  if (!deadline) return null
  const at = new Date(deadline).getTime()
  if (Number.isNaN(at)) return null
  const days = Math.ceil((at - now.getTime()) / 86_400_000)
  return days > 0 ? days : null
}

function documentsFrom(
  rows: readonly TorAnnouncement[],
  code: TorStepCode,
  announcementNo: string
): TorStepDocument[] {
  const meta = STEP_METADATA[code]
  return rows.map((row, index) => ({
    id: `${announcementNo}-${code}-${index}`,
    // The feed hands over a link, never a file name or a size, so neither is
    // claimed. The stepper omits both when they are empty.
    fileName: "",
    fileSize: "",
    name: {
      th: row.title?.trim() || meta.docTitle.th,
      en: meta.docTitle.en,
    },
    fileUrl: row.url,
    publishDate: row.publishedDate,
    docType: "pdf",
  }))
}

type TimelineSource = Pick<Tor, "announcementNo" | "deadline" | "announcements">

/**
 * Builds the stepper, or returns undefined when this project has no stored
 * announcements — the stepper then renders nothing rather than a fiction.
 */
export function buildTorTimeline(tor: TimelineSource, now: Date = new Date()): TorTimeline | undefined {
  const announcements = tor.announcements ?? []
  if (!announcements.length) return undefined

  const present = new Set(announcements.map((row) => row.announceType))

  // How far along the trunk this project has been seen to get.
  let reachedIndex = -1
  MAIN_STEP_CODES.forEach((code, index) => {
    if (present.has(code)) reachedIndex = index
  })
  if (reachedIndex < 0) return undefined

  // The newest announcement is what the project is doing now, whichever branch
  // it sits on — a cancellation is more current than the invitation it cancels.
  const newest = byNewest(announcements)[0]
  const currentStepCode = (MAIN_STEP_CODES.includes(newest.announceType as TorStepCode) ||
  newest.announceType in STEP_METADATA
    ? (newest.announceType as TorStepCode)
    : MAIN_STEP_CODES[reachedIndex]) as TorStepCode

  const steps: TorTimelineStep[] = []

  MAIN_STEP_CODES.forEach((code, index) => {
    const meta = STEP_METADATA[code]
    const rows = rowsFor(announcements, code)
    const branchCodes = (BRANCHES[code as "D0" | "W0"] ?? []).filter((branch) => present.has(branch))

    let status: TorStepStatus
    if (index < reachedIndex) {
      // Done, whether or not the announcement itself was captured. e-GP serves
      // about a month of history, so a project whose แผนงาน or ราคากลาง was
      // published last quarter has no row for it — and rendering that as
      // "รอดำเนินการ" tells a bidder the stage is still to come when the
      // project is already past submission. The step has no date and no
      // document, which is the honest part: we know it happened, not when.
      status = "completed"
    } else if (!rows.length) {
      status = "upcoming"
    } else if (branchCodes.length) {
      // The trunk step was superseded: say which way.
      status = branchCodes.some((branch) => CANCELLATIONS.has(branch)) ? "cancelled" : "amended"
    } else {
      status = "current"
    }

    // Only the step the project is actually sitting on counts down, and only
    // the invitation has a submission deadline to count down to.
    const countdown =
      status === "current" && (code === "D0" || code === "D2") ? daysUntil(tor.deadline, now) : null

    steps.push({
      code,
      title: meta.title,
      status,
      date: rows[0]?.publishedDate,
      deadline: code === "D0" ? tor.deadline || undefined : undefined,
      daysRemaining: countdown,
      description: meta.description,
      branchType: "none",
      documents: rows.length ? documentsFrom(rows, code, tor.announcementNo) : undefined,
      document: rows.length ? documentsFrom(rows, code, tor.announcementNo)[0] : undefined,
    })

    for (const branch of branchCodes) {
      const branchMeta = STEP_METADATA[branch]
      const branchRows = rowsFor(announcements, branch)
      const cancelled = CANCELLATIONS.has(branch)
      steps.push({
        code: branch,
        title: branchMeta.title,
        status: cancelled ? "cancelled" : branch === currentStepCode ? "current" : "amended",
        date: branchRows[0]?.publishedDate,
        daysRemaining: null,
        description: branchMeta.description,
        branchType: cancelled ? "cancellation" : "amendment",
        branchFrom: branchMeta.branchFrom,
        documents: branchRows.length ? documentsFrom(branchRows, branch, tor.announcementNo) : undefined,
        document: branchRows.length
          ? documentsFrom(branchRows, branch, tor.announcementNo)[0]
          : undefined,
      })
    }
  })

  return { currentStepCode, steps }
}
