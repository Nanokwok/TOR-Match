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
import {
  changedFields,
  groupByProject,
  needsInvitation,
  primary,
  primaryDocument,
  type AnnouncementSources,
} from "@/scraper/announcement-sources"
import { resolveDetailUrls } from "@/scraper/bma-detail-link"
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
  threshold: AutoApprove,
  /**
   * The document a previous run already found for this project.
   *
   * Load-bearing when the invitation turns up after the draft: by then the B0
   * has usually aged out of the seven-day feed, so this run only sees the D0.
   * Reading that alone would trade a tender document's worth of qualifications
   * for a deadline. The stored link still resolves, so both are read.
   */
  storedDocumentUrl?: string,
  /** The announcement's page on the agency's site, when one was resolved. */
  detailUrl?: string
): Promise<void> {
  const lead = primary(entry)
  // The tender document is read first because it carries the qualifications;
  // the invitation follows for the deadline. One request reads both.
  try {
    const result = await extractAndStore({
      announcementNo: entry.projectNo,
      pdfUrl: entry.draft?.pdfUrl ?? storedDocumentUrl ?? primaryDocument(entry).pdfUrl,
      invitationUrl: entry.invitation?.pdfUrl,
      detailUrl,
      publishedDate: lead.publishedDate,
      context: contextFromAnnouncement(lead),
      threshold,
    })
    const types = [entry.draft && "B0", entry.invitation && "D0"].filter(Boolean).join("+")
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
  // both, and they carry different things: B0 (ร่างเอกสารประกวดราคา) is the
  // tender document and holds the bidder qualifications but, being a draft,
  // states no closing date; D0 (ประกาศเชิญชวน) is the two-page notice that
  // defers the qualifications and does give the deadline. Collapsing them threw
  // one of those away whichever won.
  const byType = new Map<AnnounceType, EgpAnnouncement[]>()
  for (const announceType of options.announceTypes) {
    const items = await fetchAnnouncements({ deptId: env.egpDeptId, announceType })
    console.log(`[rss] ${announceType}: ${items.length} announcements`)
    byType.set(announceType, items)
  }

  const sources = groupByProject(byType)
  const overlapping = [...sources.values()].filter((s) => s.draft && s.invitation)

  const candidates = [...sources.values()].filter((entry) => {
    if (options.allCategories) return true
    const title = primary(entry).title
    return titleSuggestsSoftware({
      detailUrl: "",
      projectNo: entry.projectNo,
      title,
      department: "",
      budgetBaht: 0,
    })
  })

  console.log(
    `[rss] ${sources.size} unique announcements (${overlapping.length} published as both), ` +
      `${candidates.length} pass the software filter`
  )

  const existing = await TorDraft.find(
    { announcementNo: { $in: candidates.map((entry) => entry.projectNo) } },
    { announcementNo: 1, pdfUrl: 1, invitationUrl: 1, deadline: 1 }
  )
  const byAnnouncementNo = new Map(
    existing.map((draft) => [draft.announcementNo, draft])
  )

  // A TOR is built on the tender document, and only ever on that.
  //
  // An invitation on its own yields one or two generic lines —
  // "คุณสมบัติให้เป็นไปตามเอกสารประกวดราคา" — because it defers the
  // qualifications to a document we would not have. Publishing that produces a
  // TOR nothing can be matched against, next to TORs carrying twenty real
  // requirements. So an announcement enters only through its B0; an invitation
  // is what later fills in the deadline for one already here.
  const wanted = candidates.filter(
    (entry) => entry.draft || byAnnouncementNo.has(entry.projectNo)
  )
  const skipped = candidates.length - wanted.length
  if (skipped) {
    console.log(`[rss] skipped ${skipped} invitation-only announcement(s) — no tender document`)
  }

  const fresh = wanted.filter((entry) => {
    const draft = byAnnouncementNo.get(entry.projectNo)
    return options.force || !draft || needsInvitation(draft, entry)
  })
  const known = wanted.filter((entry) => !fresh.includes(entry))

  if (options.dryRun) {
    console.log(`\n[dry-run] ${fresh.length} to extract, ${known.length} already stored\n`)
    for (const entry of wanted) {
      const draft = byAnnouncementNo.get(entry.projectNo)
      const mark = !draft ? "NEW  " : needsInvitation(draft, entry) ? "D0+  " : "known"
      const types = [entry.draft && "B0", entry.invitation && "D0"].filter(Boolean).join("+")
      console.log(`  [${mark}] ${entry.projectNo}  ${types.padEnd(5)} ${primary(entry).title.slice(0, 56)}`)
    }
    await disconnectDB()
    return
  }

  // Known announcements: refresh what the feed can tell us, no AI involved.
  let updated = 0
  for (const entry of known) {
    const draft = byAnnouncementNo.get(entry.projectNo)
    if (!draft) continue

    const changes = changedFields(draft, entry)
    if (Object.keys(changes).length === 0) continue

    await TorDraft.updateOne({ _id: draft._id }, { $set: changes })
    updated += 1
    console.log(`[rss] ${entry.projectNo} -> updated ${Object.keys(changes).join(", ")}`)
  }

  const threshold = await autoApproveSettings()
  console.log(
    `[rss] auto-approve ${threshold.enabled ? `at >= ${threshold.threshold}` : "disabled"}`
  )

  // Looked up once for the whole batch: the feed gives only file links, so this
  // is the only way the TOR page can send a bidder somewhere they can read the
  // announcement themselves.
  const detailUrls = await resolveDetailUrls(fresh.map((entry) => entry.projectNo))
  console.log(`[rss] resolved ${detailUrls.size}/${fresh.length} announcement pages`)

  for (const entry of fresh) {
    await ingestNew(
      entry,
      threshold,
      byAnnouncementNo.get(entry.projectNo)?.pdfUrl,
      detailUrls.get(entry.projectNo)
    )
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
