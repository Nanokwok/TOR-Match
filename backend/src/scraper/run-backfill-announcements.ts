/**
 * Gives stored TORs the announcement history they were ingested without.
 *
 *   npm run backfill:announcements                # apply
 *   npm run backfill:announcements "--" --dry-run # show what would change
 *
 * The separator is quoted because PowerShell eats a bare `--`; see utils/cli-flags.
 *
 * Drafts stored before the lifecycle work kept two links and no record of what
 * they were: `pdfUrl` and `invitationUrl`. The type can be read back off the
 * URL — e-GP serves tender documents from its upload service and rendered
 * notices from its template service — so the history starts with what we have
 * rather than empty, and the next ingest adds to it instead of re-deriving it.
 *
 * Drafts from the removed BMA scraper are a different matter: their links are
 * egp2.bangkok.go.th files that say nothing about which announcement they are.
 * Those are reported, and `--prune-legacy` deletes them so the feed can bring
 * the projects back properly.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import type { AnnouncementLink } from "@/scraper/announcement-sources"
import { ANNOUNCE_TYPES } from "@/scraper/egp-rss"
import { hasFlag } from "@/utils/cli-flags"

/** e-GP's upload service serves the tender archive; everything else it renders. */
function isTenderDocument(url: string): boolean {
  return /egp-upload-service|downloadFile/i.test(url)
}

/** A link the removed Playwright scraper stored, which carries no type. */
function isLegacyLink(url: string): boolean {
  return /egp2\.bangkok\.go\.th/i.test(url)
}

function row(announceType: string, url: string, publishedDate: string, seenAt?: Date): AnnouncementLink {
  return { announceType, announceLabel: "", url, publishedDate, title: "", seenAt }
}

async function main() {
  const argv = process.argv.slice(2)
  const dryRun = hasFlag(argv, "dry-run")
  const pruneLegacy = hasFlag(argv, "prune-legacy")
  await connectDB()

  const drafts = await TorDraft.find({
    $or: [{ announcements: { $size: 0 } }, { announcements: { $exists: false } }],
  })
  console.log(`[backfill] ${drafts.length} draft(s) without an announcement history`)

  let filled = 0
  const legacy: string[] = []

  for (const draft of drafts) {
    if (isLegacyLink(draft.pdfUrl ?? "")) {
      legacy.push(draft.announcementNo)
      continue
    }

    const seenAt = draft.get("createdAt") as Date | undefined
    const rows: AnnouncementLink[] = []

    if (draft.pdfUrl) {
      rows.push(
        row(
          isTenderDocument(draft.pdfUrl) ? ANNOUNCE_TYPES.draft : ANNOUNCE_TYPES.invitation,
          draft.pdfUrl,
          draft.announcementDate?.slice(0, 10) ?? "",
          seenAt
        )
      )
    }
    if (draft.invitationUrl && draft.invitationUrl !== draft.pdfUrl) {
      rows.push(row(ANNOUNCE_TYPES.invitation, draft.invitationUrl, "", seenAt))
    }

    if (!rows.length) continue
    filled += 1
    console.log(
      `[backfill] ${draft.announcementNo} -> ${rows.map((entry) => entry.announceType).join(", ")}`
    )

    if (dryRun) continue
    await TorDraft.updateOne({ _id: draft._id }, { $set: { announcements: rows } })
    await Tor.updateOne({ announcementNo: draft.announcementNo }, { $set: { announcements: rows } })
  }

  if (legacy.length) {
    console.log(
      `\n[backfill] ${legacy.length} draft(s) came from the removed BMA scraper and cannot be typed:\n  ${legacy.join(", ")}`
    )
    if (pruneLegacy && !dryRun) {
      const published = await Tor.find({ announcementNo: { $in: legacy } }).select("_id").lean()
      await Tor.deleteMany({ announcementNo: { $in: legacy } })
      await TorDraft.deleteMany({ announcementNo: { $in: legacy } })
      console.log(`[backfill] deleted ${legacy.length} legacy draft(s) and ${published.length} published TOR(s)`)
      console.log("[backfill] the feed keeps seven days, so only recent ones will come back")
    } else {
      console.log("[backfill] pass --prune-legacy to delete them and let the feed re-ingest")
    }
  }

  console.log(`\n[backfill] ${dryRun ? "would fill" : "filled"} ${filled} draft(s)`)
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[backfill] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
