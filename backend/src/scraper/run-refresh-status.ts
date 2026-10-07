/**
 * Asks the BMA site what became of the projects we already hold.
 *
 *   npm run refresh:status                # apply
 *   npm run refresh:status "--" --dry-run # show what would change
 *
 * The separator is quoted because PowerShell eats a bare `--`; see utils/cli-flags.
 *
 * The RSS feed keeps seven days, so every TOR ingested before this lifecycle
 * work exists in the database with whatever status it had on the day it was
 * read — and a project cancelled since then still reads "เปิดรับ" to a bidder.
 * Those announcements are gone from the feed and cannot come back.
 *
 * The agency's own site still knows. This walks the stored TORs, asks it, and
 * applies only what it is authoritative about: cancellation. A status the feed
 * taught us — awarded, winner cancelled — is richer than anything here, so it
 * is left alone.
 *
 * Projects outside the BMA site have no page to ask, and are skipped.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import { fetchProjectStatus } from "@/scraper/bma-project-status"
import { resolveDetailUrls } from "@/scraper/bma-detail-link"
import { hasFlag } from "@/utils/cli-flags"

/** Statuses the feed owns; the site's "in progress" must not overwrite them. */
const FEED_OWNED = new Set(["awarded", "winner-cancelled", "winner-revised", "changed"])

const REQUEST_GAP_MS = 400

async function main() {
  const dryRun = hasFlag(process.argv.slice(2), "dry-run")
  await connectDB()

  const drafts = await TorDraft.find(
    {},
    { announcementNo: 1, status: 1, detailUrl: 1 }
  ).lean()
  console.log(`[refresh] ${drafts.length} stored project(s)`)

  // Drafts ingested before the page lookup existed have no detailUrl; resolve
  // the missing ones once rather than per project.
  const missing = drafts.filter((draft) => !draft.detailUrl).map((draft) => draft.announcementNo)
  const resolved = missing.length ? await resolveDetailUrls(missing) : new Map<string, string>()
  if (missing.length) {
    console.log(`[refresh] resolved ${resolved.size}/${missing.length} missing project page(s)`)
  }

  let changed = 0
  let unreachable = 0
  const vocabulary = new Map<string, string>()

  for (const draft of drafts) {
    const detailUrl = draft.detailUrl || resolved.get(draft.announcementNo)
    if (!detailUrl) {
      unreachable += 1
      continue
    }

    await new Promise((resolve) => setTimeout(resolve, REQUEST_GAP_MS))
    const report = await fetchProjectStatus(detailUrl).catch(() => null)
    if (!report) {
      unreachable += 1
      continue
    }

    // Collected so an unrecognised code shows up in the log rather than being
    // silently read as "nothing to do".
    if (report.code) vocabulary.set(report.code, report.label)

    if (!report.status || report.status === draft.status) continue
    if (FEED_OWNED.has(draft.status)) {
      console.log(
        `[refresh] ${draft.announcementNo} stays ${draft.status} — the feed knows more than "${report.label}"`
      )
      continue
    }

    changed += 1
    console.log(
      `[refresh] ${draft.announcementNo}: ${draft.status} -> ${report.status} ("${report.label}")`
    )
    if (dryRun) continue

    await TorDraft.updateOne({ _id: draft._id }, { $set: { status: report.status } })
    await Tor.updateOne({ announcementNo: draft.announcementNo }, { $set: { status: report.status } })
  }

  console.log(
    `\n[refresh] ${dryRun ? "would change" : "changed"} ${changed}, ${unreachable} without a project page`
  )
  console.log(
    `[refresh] status codes seen: ${[...vocabulary].map(([code, label]) => `${code}=${label}`).join(", ") || "none"}`
  )
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[refresh] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
