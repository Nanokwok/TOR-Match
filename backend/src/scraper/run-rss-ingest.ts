/**
 * Ingests Bangkok procurement announcements from the CGD e-GP RSS feed.
 *
 *   npm run ingest                      # every announcement type, today's feed
 *   npm run ingest "--" --days 3        # walk three days back — see below
 *   npm run ingest "--" --days 120 --offset 120   # the 120 days before those
 *   npm run ingest "--" --dry-run       # show what would happen, touch nothing
 *   npm run ingest "--" --all           # keep non-software announcements too
 *   npm run ingest "--" --force         # re-extract announcements already stored
 *   npm run ingest "--" --types B0,D0   # only these types
 *   npm run ingest "--" --narrow        # also sweep by methodId (see below)
 *
 * The separator is quoted because PowerShell eats a bare `--`; see hasFlag.
 *
 * **The 20-item cap, and what gets past it.** The feed returns at most 20
 * announcements per type per day (§4.2) while telling you how many exist, so a
 * day with 84 plans hands over 20. Two escapes were tried against the live
 * feed:
 *
 *  - `methodId`, re-querying per procurement method. Measured: zero extra
 *    announcements. Ignored outright for P0, and for D0 it is honoured but
 *    cannot split a day in which nearly everything is e-bidding. Still
 *    available as `--narrow`, off by default because it costs twelve requests
 *    per truncated type and buys nothing.
 *  - `announceDate`, one query per day. This works. Each day gets its own
 *    allowance and the feed answers far past the seven days it backfills — 45
 *    days back still returned announcements. For B0+D0 over 45 days that was
 *    405 projects against 20 from the undated query.
 *
 * So `--days N` is the setting that decides how much this sees. It costs one
 * request per type per day, which is why it is explicit rather than the
 * default: a nightly run wants `--days 2` or 3 (nothing published yesterday can
 * be missed), while a one-off catch-up wants 30 or more and should be dry-run
 * first — old announcements extract exactly like new ones, and their bidding
 * has usually closed.
 *
 * The flow, cheapest step first so nothing expensive runs on an announcement
 * that will be discarded:
 *
 *   RSS (all nine announcement types, in lifecycle order)
 *     -> software filter, on the title alone          — free
 *     -> already in the database?
 *          yes -> update what changed, no AI          — free
 *          no  -> download PDF -> Gemini extraction   — the paid step
 *     -> at or above the confidence threshold an admin set in
 *        /admin/settings, publish straight to /browse; below it, park the
 *        draft in /admin for a reviewer
 *
 * Unlike run-scrape.ts this never touches egp2.bangkok.go.th: the feed hands
 * over a direct PDF link, so no browser and no robots.txt exception is needed.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { env } from "@/config/env"
import { TorDraft } from "@/models/TorDraft.model"
import {
  groupByProject,
  linksFor,
  mergeAnnouncementLinks,
  type AnnouncementLink,
  primary,
  type AnnouncementSources,
} from "@/scraper/announcement-sources"
import { planForProject, statusForTypes, type IngestAction } from "@/scraper/announcement-plan"
import {
  applyLinks,
  applyMedianPrice,
  applyStatus,
} from "@/services/announcement-lifecycle.service"
import { ageStatuses } from "@/services/deadline-status.service"
import { resolveDetailUrls } from "@/scraper/bma-detail-link"
import type { ExtractionContext } from "@/scraper/extract"
import {
  autoApproveSettings,
  extractAndStore,
  type AutoApprove,
} from "@/services/tor-extraction.service"
import { hasFlag, readFlag } from "@/utils/cli-flags"
import {
  ANNOUNCE_TYPES,
  announceDateCode,
  FEED_WINDOW_LABEL,
  fetchAnnouncements,
  fetchAnnouncementsOverDays,
  isFeedOpen,
  type AnnounceType,
  type EgpAnnouncement,
} from "@/scraper/egp-rss"
import { titleSuggestsSoftware } from "@/scraper/software-filter"

type Options = {
  dryRun: boolean
  allCategories: boolean
  force: boolean
  announceTypes: AnnounceType[]
  /**
   * How many days back to query, one request per type per day. Undefined uses
   * a single undated query per type, which the feed backfills over seven days
   * to reach twenty items.
   */
  days?: number
  /** Days to skip before `--days` starts, for continuing a sectioned backfill. */
  offset: number
  /** Opts back into the per-method sweep, which measurement showed gains nothing. */
  narrow: boolean
  /** Restricts the run to these project numbers, for inspecting or repairing a few. */
  only?: Set<string>
}

function parseArgs(argv: string[]): Options {
  return {
    dryRun: hasFlag(argv, "dry-run"),
    allCategories: hasFlag(argv, "all"),
    // An announcement already extracted is not re-read: the PDF behind a
    // project number does not change, and re-reading it costs a full extraction.
    force: hasFlag(argv, "force"),
    announceTypes: parseAnnounceTypes(readFlag(argv, "types")),
    days: parseDays(readFlag(argv, "days")),
    offset: parseDays(readFlag(argv, "offset")) ?? 0,
    narrow: hasFlag(argv, "narrow"),
    only: parseOnly(readFlag(argv, "only")),
  }
}

/** `--only 69109001213,69099357872` — one project number or several. */
function parseOnly(raw: string | undefined): Set<string> | undefined {
  if (!raw) return undefined
  const wanted = raw.split(",").map((part) => part.trim()).filter(Boolean)
  return wanted.length ? new Set(wanted) : undefined
}

function parseDays(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  const days = Number(raw)
  if (!Number.isInteger(days) || days < 1) {
    throw new Error(`--days must be a positive whole number, got "${raw}"`)
  }
  return days
}

/**
 * The feed is read in lifecycle order, so a project's own history arrives in
 * the order it happened: the plan, then the price, the tender, the notice and
 * its amendments, then the award and its corrections.
 */
const LIFECYCLE_ORDER: AnnounceType[] = [
  ANNOUNCE_TYPES.plan,
  ANNOUNCE_TYPES.medianPrice,
  ANNOUNCE_TYPES.draft,
  ANNOUNCE_TYPES.invitation,
  ANNOUNCE_TYPES.invitationChanged,
  ANNOUNCE_TYPES.invitationCancelled,
  ANNOUNCE_TYPES.winner,
  ANNOUNCE_TYPES.winnerCancelled,
  ANNOUNCE_TYPES.winnerChanged,
]

const ALL_ANNOUNCE_TYPES = new Set<string>(Object.values(ANNOUNCE_TYPES))

/**
 * How old an announcement has to be before a dry run flags it as probably
 * closed. A BMA e-bidding window runs one to three weeks from the invitation,
 * so three weeks is where "still biddable" stops being the likely case. Only
 * ever used to report — nothing is skipped on account of its age.
 */
const STALE_AFTER_DAYS = 21

function parseAnnounceTypes(raw: string | undefined): AnnounceType[] {
  if (!raw) return LIFECYCLE_ORDER

  const wanted = raw.split(",").map((part) => part.trim().toUpperCase()).filter(Boolean)
  const unknown = wanted.filter((type) => !ALL_ANNOUNCE_TYPES.has(type))
  if (unknown.length) {
    throw new Error(`Unknown announce type(s): ${unknown.join(", ")}. Known: ${[...ALL_ANNOUNCE_TYPES].join(", ")}`)
  }
  // Kept in lifecycle order however they were listed on the command line.
  return LIFECYCLE_ORDER.filter((type) => wanted.includes(type))
}

function contextFromAnnouncement(announcement: EgpAnnouncement): ExtractionContext {
  return {
    projectNo: announcement.projectNo,
    metadata: {
      "ชื่อโครงการ": announcement.title,
      "หน่วยงาน": "กรุงเทพมหานคร",
      "วิธีการจัดหา": announcement.methodLabel,
      "ประเภทประกาศ": announcement.announceLabel,
      "วันที่ประกาศ": announcement.publishedDate,
    },
  }
}

async function ingestNew(
  entry: AnnouncementSources,
  action: Extract<IngestAction, { kind: "extract" }>,
  threshold: AutoApprove,
  rows: readonly AnnouncementLink[],
  stored?: { pdfUrl?: string; invitationUrl?: string },
  /** The announcement's page on the agency's site, when one was resolved. */
  detailUrl?: string,
  /** Whether the title reads like IT work — stored as a label for /browse. */
  softwareRelated = false
): Promise<void> {
  const lead = primary(entry)
  const links = linksFor(entry, stored)

  try {
    const result = await extractAndStore({
      announcementNo: entry.projectNo,
      pdfUrl: links.pdfUrl || action.urls[0],
      invitationUrl: links.invitationUrl || undefined,
      detailUrl,
      publishedDate: lead.publishedDate,
      context: contextFromAnnouncement(lead),
      threshold,
      // Which announcement this reads decides what it may overwrite: a notice
      // must not replace the tender's qualifications with its own deferral.
      from: action.from,
      announcements: rows,
      softwareRelated,
    })
    const types = [...new Set(entry.all.map((item) => item.announceType))].join("+")
    console.log(
      `[rss] ${result.announcementNo} -> ${types}, extracted from ${result.documents} doc(s) ` +
        `(confidence ${result.aiConfidence}, ${result.outcome})`
    )
  } catch (error) {
    // A broken PDF or a refused extraction must not end the run — the next
    // announcement is independent, and the failure is visible in /admin.
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[rss] ${entry.projectNo} -> failed: ${message}`)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (!env.egpDeptId) {
    throw new Error("EGP_DEPT_ID must be set (the BMA's e-GP agency code)")
  }
  if (!isFeedOpen()) {
    console.warn(
      `[rss] the e-GP feed only answers during ${FEED_WINDOW_LABEL} — continuing anyway, expect an empty result`
    )
  }

  await connectDB()

  // Both types are kept, not merged into one. A project can be published as
  // Every type is kept apart, never merged: they carry different things. B0
  // (ร่างเอกสารประกวดราคา) is the tender document and holds the bidder
  // qualifications but, being a draft, states no closing date; D0
  // (ประกาศเชิญชวน) is the two-page notice that defers the qualifications and
  // does give the deadline; D1/D2 and W0/W1/W2 say what became of the project.
  // Collapsing them threw away whichever lost.
  if (options.days) {
    console.log(
      `[rss] walking ${options.days} day(s)` +
        (options.offset ? ` starting ${options.offset} day(s) back` : " back") +
        ` — about ${options.days * options.announceTypes.length} feed request(s)`
    )
  }

  const byType = new Map<AnnounceType, EgpAnnouncement[]>()
  let requests = 0
  for (const announceType of options.announceTypes) {
    const result = options.days
      ? await fetchAnnouncementsOverDays(
          { deptId: env.egpDeptId, announceType },
          { days: options.days, offset: options.offset }
        )
      : await fetchAnnouncements(
          { deptId: env.egpDeptId, announceType },
          { narrowOnTruncation: options.narrow }
        )
    requests += result.requests

    // countByDay is the day's total (§4.7), summed over the days walked. Items
    // can exceed it on an undated query, because the feed backfills up to seven
    // days to reach twenty (§4.2) — so it is only worth printing when the feed
    // admits it held something back, or when a request could not be made.
    const notes: string[] = []
    if (result.cappedDays?.length) {
      // The cap is per day and cannot be split further: methodId is measured
      // not to work, leaving only deptSubId.
      notes.push(
        `${result.countByDay} published over those days, ` +
          `${result.cappedDays.length} day(s) over the cap (${result.cappedDays.slice(0, 3).join(", ")}${
            result.cappedDays.length > 3 ? ", …" : ""
          })`
      )
    } else if (result.truncated) {
      notes.push(`${result.countByDay} published today, ${result.items.length} returned`)
    }
    if (result.failedDays?.length) {
      notes.push(`${result.failedDays.length} day(s) failed`)
    }
    if (result.saturatedMethods.length) {
      notes.push(`method ${result.saturatedMethods.join("/")} over the cap on its own`)
    }
    if (result.failedMethods.length) {
      notes.push(`${result.failedMethods.length} narrowing request(s) failed`)
    }
    const note = notes.length ? ` — ${notes.join("; ")}` : ""
    console.log(`[rss] ${announceType}: ${result.items.length} announcements${note}`)
    byType.set(announceType, result.items)
  }
  console.log(`[rss] ${requests} feed request(s) for ${options.announceTypes.length} type(s)`)

  const sources = groupByProject(byType)

  // The software heuristic is recorded on every project it reaches, and only
  // *selects* when --all is absent. Keeping the verdict rather than acting on
  // it alone means a project the title heuristic misjudged is still on file.
  const softwareBy = new Map(
    [...sources.values()].map((entry) => [
      entry.projectNo,
      titleSuggestsSoftware({ title: primary(entry).title }),
    ])
  )

  const candidates = [...sources.values()].filter((entry) => {
    // --only narrows a run to named projects, so a handful of extractions can
    // be paid for and inspected without ingesting everything the feed offered.
    if (options.only && !options.only.has(entry.projectNo)) return false
    if (options.allCategories) return true
    return softwareBy.get(entry.projectNo) ?? false
  })

  const software = [...softwareBy.values()].filter(Boolean).length
  console.log(
    `[rss] ${sources.size} unique projects, ${software} look like software` +
      (options.allCategories ? ` — ingesting all ${candidates.length}` : `, and only those are ingested`)
  )

  const existing = await TorDraft.find(
    { announcementNo: { $in: candidates.map((entry) => entry.projectNo) } },
    { announcementNo: 1, pdfUrl: 1, invitationUrl: 1, deadline: 1, status: 1, announcements: 1 }
  )
  const byAnnouncementNo = new Map(existing.map((draft) => [draft.announcementNo, draft]))

  // One decision per project, taken before anything is downloaded or written,
  // so a dry run reports exactly what a real run would do.
  const planned = candidates.map((entry) => {
    const stored = byAnnouncementNo.get(entry.projectNo)
    return {
      entry,
      stored,
      rows: mergeAnnouncementLinks(stored?.announcements, entry),
      action: planForProject({
        entry,
        stored: stored ?? undefined,
        force: options.force,
      }),
    }
  })

  const counts = planned.reduce<Record<string, number>>((tally, item) => {
    tally[item.action.kind] = (tally[item.action.kind] ?? 0) + 1
    return tally
  }, {})
  console.log(
    `[rss] planned: ${Object.entries(counts).map(([kind, n]) => `${n} ${kind}`).join(", ") || "nothing"}`
  )

  if (options.dryRun) {
    console.log("")
    for (const { entry, action, rows } of planned) {
      const types = [...new Set(entry.all.map((item) => item.announceType))].join("+")
      const detail =
        action.kind === "none"
          ? action.reason
          : action.kind === "status"
            ? `${action.status} (from ${action.from})`
            : action.kind === "extract"
              ? `${action.urls.length} doc(s) from ${action.from}`
              : action.kind === "links"
                ? `${rows.added.length} new link(s)`
                : "median price"
      const lead = primary(entry)
      console.log(
        `  [${action.kind.padEnd(13)}] ${entry.projectNo}  ${types.padEnd(8)} ` +
          `${(lead.publishedDate || "no date").padEnd(11)} ${detail.padEnd(26)} ${lead.title.slice(0, 40)}`
      )
    }

    // With --days the feed hands over weeks of history, and an announcement
    // from last month extracts exactly like today's while its bidding has
    // almost certainly closed. The dates above are what that costs, so they
    // are summarised rather than left to be read off the list.
    const extracts = planned.filter((item) => item.action.kind === "extract")
    if (options.days && extracts.length) {
      const cutoff = announceDateCode(STALE_AFTER_DAYS)
      const stale = extracts.filter(
        (item) => (primary(item.entry).publishedDate ?? "").replace(/-/g, "") < cutoff
      )
      console.log(
        `\n[rss] ${extracts.length} extraction(s) planned, ${stale.length} of them from announcements ` +
          `older than ${STALE_AFTER_DAYS} days — their bidding has probably closed`
      )
    }
    await disconnectDB()
    return
  }

  const extracting = planned.filter((item) => item.action.kind === "extract")

  const threshold = await autoApproveSettings()
  console.log(
    `[rss] auto-approve ${threshold.enabled ? `at >= ${threshold.threshold}` : "disabled"}`
  )

  // Looked up once for the whole batch: the feed gives only file links, so this
  // is the only way the TOR page can send a bidder somewhere they can read the
  // announcement themselves.
  const detailUrls = await resolveDetailUrls(extracting.map((item) => item.entry.projectNo))
  console.log(`[rss] resolved ${detailUrls.size}/${extracting.length} announcement pages`)

  let statusChanges = 0
  let linkUpdates = 0

  for (const { entry, stored, rows, action } of planned) {
    switch (action.kind) {
      case "none":
        break

      case "links":
        if (!rows.added.length) break
        await applyLinks(entry.projectNo, rows.rows)
        linkUpdates += 1
        console.log(
          `[rss] ${entry.projectNo} -> recorded ${rows.added.map((row) => row.announceType).join(", ")}`
        )
        break

      case "status": {
        // What a project's outcome is comes from which announcement was
        // published, so this needs no document and no model call.
        const next = statusForTypes([...entry.all.map((item) => item.announceType)], stored?.status)
        const status = next ?? action.status
        await applyStatus(entry.projectNo, status, rows.rows)
        statusChanges += 1
        console.log(`[rss] ${entry.projectNo} -> ${status} (from ${action.from})`)
        break
      }

      case "median-price":
        // A page or two stating one number, so this is a fraction of a full
        // extraction — and the figure it gives outranks any a tender mentions.
        await applyLinks(entry.projectNo, rows.rows)
        linkUpdates += 1
        try {
          const price = await applyMedianPrice(
            entry.projectNo,
            action.url,
            contextFromAnnouncement(primary(entry))
          )
          console.log(
            price
              ? `[rss] ${entry.projectNo} -> median price ${price.toLocaleString()} baht`
              : `[rss] ${entry.projectNo} -> median-price announcement states no figure`
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.warn(`[rss] ${entry.projectNo} -> median price failed: ${message}`)
        }
        break

      case "extract":
        await ingestNew(
          entry,
          action,
          threshold,
          rows.rows,
          stored ?? undefined,
          detailUrls.get(entry.projectNo),
          softwareBy.get(entry.projectNo) ?? false
        )
        break
    }
  }

  // A deadline passes without anything being announced, and this run has just
  // published invitations that may already be weeks old — so the statuses are
  // brought up to date here rather than waiting for a separate job.
  const aged = await ageStatuses()
  for (const change of aged) {
    console.log(`[rss] ${change.announcementNo} -> ${change.to} (deadline ${change.deadline})`)
  }

  console.log(
    `
[rss] done — ${extracting.length} extracted, ${statusChanges} status change(s), ` +
      `${linkUpdates} link update(s), ${aged.length} aged by deadline`
  )
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[rss] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
