/**
 * Ingests Bangkok procurement announcements from the CGD e-GP RSS feed.
 *
 *   npm run ingest                      # every announcement type
 *   npm run ingest "--" --dry-run       # show what would happen, touch nothing
 *   npm run ingest "--" --all           # keep non-software announcements too
 *   npm run ingest "--" --force         # re-extract announcements already stored
 *   npm run ingest "--" --types B0,D0   # only these types
 *   npm run ingest "--" --no-narrow     # one request per type, accept the 20-item cap
 *
 * The separator is quoted because PowerShell eats a bare `--`; see hasFlag.
 *
 * The feed caps a day at 20 announcements per type (§4.2) and says how many it
 * held back, so a day with 68 plans returns 20 of them. Every type is therefore
 * re-queried per procurement method when that happens — each narrower query has
 * its own allowance — and what the sweep cost, plus whatever it still could not
 * reach, is logged per type. `--no-narrow` buys a cheap run at the cap's price.
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
  FEED_WINDOW_LABEL,
  fetchAnnouncements,
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
  /** Skips the per-method sweep: one request per type, as before. */
  noNarrow: boolean
  /** Restricts the run to one project number, for inspecting a single extraction. */
  only?: string
}

function parseArgs(argv: string[]): Options {
  return {
    dryRun: hasFlag(argv, "dry-run"),
    allCategories: hasFlag(argv, "all"),
    // An announcement already extracted is not re-read: the PDF behind a
    // project number does not change, and re-reading it costs a full extraction.
    force: hasFlag(argv, "force"),
    announceTypes: parseAnnounceTypes(readFlag(argv, "types")),
    noNarrow: hasFlag(argv, "no-narrow"),
    only: readFlag(argv, "only"),
  }
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
  detailUrl?: string
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
  const byType = new Map<AnnounceType, EgpAnnouncement[]>()
  let requests = 0
  for (const announceType of options.announceTypes) {
    const result = await fetchAnnouncements(
      { deptId: env.egpDeptId, announceType },
      { narrowOnTruncation: !options.noNarrow }
    )
    requests += result.requests

    // countByDay is today's total (§4.7); the items can exceed it because the
    // feed backfills up to seven days to reach twenty (§4.2). So it is only
    // worth printing when the feed admits it held something back, or when the
    // sweep cost something, or when it could not finish.
    const notes: string[] = []
    if (result.truncated) {
      notes.push(`${result.countByDay} published today, still short after ${result.requests} request(s)`)
    } else if (result.requests > 1) {
      notes.push(`${result.countByDay} published today, reached by narrowing (${result.requests} requests)`)
    }
    // Over the cap within a single method: method is the only axis this sweep
    // splits on, so what is left needs announceDate (§4.6) or deptSubId.
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

  const candidates = [...sources.values()].filter((entry) => {
    // --only narrows a run to one project, so a single extraction can be paid
    // for and inspected without ingesting everything the feed offered.
    if (options.only && entry.projectNo !== options.only) return false
    if (options.allCategories) return true
    return titleSuggestsSoftware({ title: primary(entry).title })
  })

  console.log(
    `[rss] ${sources.size} unique projects, ${candidates.length} pass the software filter`
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
      console.log(
        `  [${action.kind.padEnd(13)}] ${entry.projectNo}  ${types.padEnd(8)} ${detail.padEnd(26)} ${primary(entry).title.slice(0, 44)}`
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
          detailUrls.get(entry.projectNo)
        )
        break
    }
  }

  console.log(
    `
[rss] done — ${extracting.length} extracted, ${statusChanges} status change(s), ` +
      `${linkUpdates} link update(s)`
  )
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[rss] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
