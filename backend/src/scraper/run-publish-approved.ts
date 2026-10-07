/**
 * Publishes every auto-approved draft that never reached /browse.
 *
 *   npm run publish:approved                # publish them
 *   npm run publish:approved "--" --dry-run # list them, touch nothing
 *
 * The separator is quoted because PowerShell eats a bare `--`; see hasFlag.
 *
 * The ingest now publishes as it goes, so this is a backfill: it covers drafts
 * extracted before that existed, and drafts an operator re-extracted with
 * `--force` after a pipeline fix. Safe to re-run — publishing upserts by
 * announcementNo.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import { publishBlocker, publishDraft } from "@/services/tor-publish.service"
import { hasFlag } from "@/utils/cli-flags"

async function main() {
  const dryRun = hasFlag(process.argv.slice(2), "dry-run")

  await connectDB()

  // A reviewer-approved draft is normally left alone, because its published TOR
  // may carry hand corrections this would overwrite. That only holds while the
  // TOR exists: one approved draft had been withdrawn before its invitation
  // arrived and was never picked back up, so an open tender with three weeks to
  // run was sitting in the drafts collection where nobody could bid on it.
  //
  // So "approved" is included when `tors` has nothing under that announcement
  // number — there is no human work to overwrite. Membership is read from the
  // collection rather than from draft.publishedTorId, which auto-publishing
  // never writes back.
  const [autoApproved, approved, live] = await Promise.all([
    TorDraft.find({ reviewStatus: "auto-approved" }).sort({ announcementNo: 1 }),
    TorDraft.find({ reviewStatus: "approved" }).sort({ announcementNo: 1 }),
    Tor.find({}, { announcementNo: 1 }).lean(),
  ])
  const onBrowse = new Set(live.map((tor) => tor.announcementNo))
  const unpublishedApproved = approved.filter((draft) => !onBrowse.has(draft.announcementNo))
  const drafts = [...autoApproved, ...unpublishedApproved]

  console.log(
    `[publish] ${autoApproved.length} auto-approved draft(s)` +
      (unpublishedApproved.length
        ? `, and ${unpublishedApproved.length} approved draft(s) with no published TOR`
        : "")
  )

  let published = 0
  let skipped = 0

  for (const draft of drafts) {
    const blocker = publishBlocker(draft)
    if (blocker) {
      skipped += 1
      console.warn(`[publish] ${draft.announcementNo} -> skipped: ${blocker}`)
      continue
    }

    const quals = draft.qualificationRequirements?.length ?? 0
    if (dryRun) {
      console.log(`[dry-run] ${draft.announcementNo} -> would publish (${quals} quals)`)
      continue
    }

    await publishDraft(draft)
    published += 1
    console.log(`[publish] ${draft.announcementNo} -> published (${quals} quals)`)
  }

  console.log(
    dryRun
      ? `\n[dry-run] ${drafts.length - skipped} would publish, ${skipped} blocked`
      : `\n[publish] done — ${published} published, ${skipped} blocked`
  )
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[publish] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
