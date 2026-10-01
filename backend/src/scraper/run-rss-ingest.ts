/**
 * Ingests Bangkok procurement announcements from the CGD e-GP RSS feed.
 *
 *   npm run ingest                   # both announcement types
 *   npm run ingest "--" --dry-run    # show what would happen, touch nothing
 *   npm run ingest "--" --all        # keep non-software announcements too
 *   npm run ingest "--" --force      # re-extract announcements already stored
 *
 * The separator is quoted because PowerShell eats a bare `--`; see hasFlag.
 *
 * The flow, cheapest step first so nothing expensive runs on an announcement
 * that will be discarded:
 *
 *   RSS (B0 draft + D0 invitation)
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
import type { ExtractionContext } from "@/scraper/extract"
import {
  autoApproveSettings,
  extractAndStore,
  type AutoApprove,
} from "@/services/tor-extraction.service"
import { hasFlag } from "@/utils/cli-flags"
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
}

function parseArgs(argv: string[]): Options {
  return {
    dryRun: hasFlag(argv, "dry-run"),
    allCategories: hasFlag(argv, "all"),
    // An announcement already extracted is not re-read: the PDF behind a
    // project number does not change, and re-reading it costs a full extraction.
    force: hasFlag(argv, "force"),
    announceTypes: [ANNOUNCE_TYPES.draft, ANNOUNCE_TYPES.invitation],
  }
}

/** The PDF link is the one thing a re-published announcement tends to change. */
function changedFields(
  draft: { pdfUrl?: string; sourceUrl?: string },
  announcement: EgpAnnouncement
): Record<string, string> {
  const changes: Record<string, string> = {}
  if (announcement.pdfUrl && draft.pdfUrl !== announcement.pdfUrl) {
    changes.pdfUrl = announcement.pdfUrl
  }
  return changes
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
  announcement: EgpAnnouncement,
  threshold: AutoApprove
): Promise<void> {
  try {
    const result = await extractAndStore({
      announcementNo: announcement.projectNo,
      pdfUrl: announcement.pdfUrl,
      publishedDate: announcement.publishedDate,
      context: contextFromAnnouncement(announcement),
      threshold,
    })
    console.log(
      `[rss] ${result.announcementNo} -> extracted from ${result.documents} doc(s) ` +
        `(confidence ${result.aiConfidence}, ${result.outcome})`
    )
  } catch (error) {
    // A broken PDF or a refused extraction must not end the run — the next
    // announcement is independent, and the failure is visible in /admin.
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[rss] ${announcement.projectNo} -> failed: ${message}`)
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

  // Ordered worst-to-best so a later, richer document overwrites an earlier one.
  //
  // A project can appear under both types, and the documents differ in what
  // they contain: D0 (ประกาศเชิญชวน) is a two-page notice that points at the
  // tender document for the bidder requirements, while B0 (ร่างเอกสารประกวดราคา)
  // is that document. Extraction is only as good as the PDF it reads, so the
  // draft wins wherever both exist.
  const byPreference = [ANNOUNCE_TYPES.invitation, ANNOUNCE_TYPES.draft].filter(
    (type) => options.announceTypes.includes(type)
  )

  const seen = new Map<string, EgpAnnouncement>()
  for (const announceType of byPreference) {
    const items = await fetchAnnouncements({ deptId: env.egpDeptId, announceType })
    console.log(`[rss] ${announceType}: ${items.length} announcements`)
    for (const item of items) seen.set(item.projectNo, item)
  }

  const candidates = options.allCategories
    ? [...seen.values()]
    : [...seen.values()].filter((item) =>
        titleSuggestsSoftware({
          detailUrl: "",
          projectNo: item.projectNo,
          title: item.title,
          department: "",
          budgetBaht: 0,
        })
      )

  console.log(
    `[rss] ${seen.size} unique announcements, ${candidates.length} pass the software filter`
  )

  const existing = await TorDraft.find(
    { announcementNo: { $in: candidates.map((item) => item.projectNo) } },
    { announcementNo: 1, pdfUrl: 1 }
  )
  const byAnnouncementNo = new Map(
    existing.map((draft) => [draft.announcementNo, draft])
  )

  const fresh = candidates.filter(
    (item) => options.force || !byAnnouncementNo.has(item.projectNo)
  )
  const known = candidates.filter(
    (item) => !options.force && byAnnouncementNo.has(item.projectNo)
  )

  if (options.dryRun) {
    console.log(`\n[dry-run] ${fresh.length} to extract, ${known.length} already stored\n`)
    for (const item of candidates) {
      const mark = byAnnouncementNo.has(item.projectNo) ? "known" : "NEW  "
      console.log(`  [${mark}] ${item.projectNo}  ${item.title.slice(0, 62)}`)
    }
    await disconnectDB()
    return
  }

  // Known announcements: refresh what the feed can tell us, no AI involved.
  let updated = 0
  for (const item of known) {
    const draft = byAnnouncementNo.get(item.projectNo)
    if (!draft) continue

    const changes = changedFields(draft, item)
    if (Object.keys(changes).length === 0) continue

    await TorDraft.updateOne({ _id: draft._id }, { $set: changes })
    updated += 1
    console.log(`[rss] ${item.projectNo} -> updated ${Object.keys(changes).join(", ")}`)
  }

  const threshold = await autoApproveSettings()
  console.log(
    `[rss] auto-approve ${threshold.enabled ? `at >= ${threshold.threshold}` : "disabled"}`
  )

  for (const item of fresh) {
    await ingestNew(item, threshold)
  }

  console.log(
    `\n[rss] done — ${fresh.length} extracted, ${updated} updated, ${known.length - updated} unchanged`
  )
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[rss] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
