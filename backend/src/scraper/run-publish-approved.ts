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
import { TorDraft } from "@/models/TorDraft.model"
import { publishBlocker, publishDraft } from "@/services/tor-publish.service"
import { hasFlag } from "@/utils/cli-flags"

async function main() {
  const dryRun = hasFlag(process.argv.slice(2), "dry-run")

  await connectDB()

  // "approved" is excluded: a reviewer already published those, and their
  // published TOR may carry hand corrections this script would overwrite.
  const drafts = await TorDraft.find({ reviewStatus: "auto-approved" }).sort({
    announcementNo: 1,
  })

  console.log(`[publish] ${drafts.length} auto-approved draft(s) awaiting publish`)

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
