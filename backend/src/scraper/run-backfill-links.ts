/**
 * Points every stored TOR at the website its announcement lives on.
 *
 *   npm run backfill:links                # apply
 *   npm run backfill:links "--" --dry-run # show the diff, touch nothing
 *
 * The separator is quoted because PowerShell eats a bare `--`; see utils/cli-flags.
 *
 * The RSS feed only ever hands over a file, so TORs ingested before the page
 * lookup existed have a "view original" button that downloads a ZIP instead of
 * opening somewhere a bidder can read. This resolves the page for each stored
 * announcement and repoints `sourceUrl` at it.
 *
 * Announcements outside the BMA site resolve to nothing and keep their document
 * link — a button that goes to a file beats one that goes nowhere.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import { sourceUrlFor } from "@/scraper/announcement-sources"
import { resolveDetailUrls } from "@/scraper/bma-detail-link"
import { hasFlag } from "@/utils/cli-flags"

function shorten(url: string): string {
  return url.length > 64 ? `${url.slice(0, 61)}...` : url
}

async function main() {
  const dryRun = hasFlag(process.argv.slice(2), "dry-run")
  await connectDB()

  const drafts = await TorDraft.find(
    {},
    { announcementNo: 1, pdfUrl: 1, invitationUrl: 1, detailUrl: 1, sourceUrl: 1 }
  )
  console.log(`[links] ${drafts.length} stored announcement(s)`)

  const resolved = await resolveDetailUrls(drafts.map((draft) => draft.announcementNo))
  console.log(`[links] resolved ${resolved.size}/${drafts.length} announcement pages\n`)

  let changed = 0
  for (const draft of drafts) {
    const detailUrl = resolved.get(draft.announcementNo) ?? draft.detailUrl ?? ""
    const sourceUrl = sourceUrlFor({
      detailUrl,
      invitationUrl: draft.invitationUrl,
      pdfUrl: draft.pdfUrl,
    })
    if (sourceUrl === draft.sourceUrl && detailUrl === (draft.detailUrl ?? "")) continue

    const fallback = detailUrl
      ? ""
      : sourceUrl === draft.invitationUrl
        ? "   (no agency page — the ประกาศเชิญชวน instead)"
        : "   (no agency page and no invitation — the tender archive)"
    console.log(`  ${draft.announcementNo}`)
    console.log(`    was: ${shorten(draft.sourceUrl ?? "")}`)
    console.log(`    now: ${shorten(sourceUrl)}${fallback}`)
    changed += 1

    if (dryRun) continue
    // Both collections: /browse reads `tors`, and the draft is what a
    // re-publish would copy from.
    await TorDraft.updateOne({ _id: draft._id }, { $set: { detailUrl, sourceUrl } })
    await Tor.updateOne({ announcementNo: draft.announcementNo }, { $set: { sourceUrl } })
  }

  console.log(
    dryRun
      ? `\n[links] dry run — ${changed} would change`
      : `\n[links] done — ${changed} updated`
  )
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[links] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
