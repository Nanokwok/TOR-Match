/**
 * Removes announcements that were only ever an invitation.
 *
 *   npm run prune                            # apply
 *   npm run prune "--" --dry-run             # list them, touch nothing
 *   npm run prune "--" --keep 69099506790    # spare specific announcements
 *
 * The separator is quoted because PowerShell eats a bare `--`; see utils/cli-flags.
 *
 * A D0 ประกาศเชิญชวน defers the bidder qualifications to the tender document
 * rather than restating them, so a TOR built from one carries a line or two of
 * "คุณสมบัติให้เป็นไปตามเอกสารประกวดราคา" and nothing a company profile can be
 * matched against. Sitting in /browse beside TORs with twenty real
 * requirements, they read as broken rather than as thin.
 *
 * The ingest no longer admits them, so removing them here is permanent — and it
 * has to be: B0 is published *before* D0, so an announcement seen only as an
 * invitation has already missed its tender document and will never gain one.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { Notification } from "@/models/Notification.model"
import { QualificationSelfCheck } from "@/models/QualificationSelfCheck.model"
import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import { hasFlag } from "@/utils/cli-flags"

/** Whether this draft was read from a B0 tender archive. */
function fromTenderDocument(pdfUrl?: string): boolean {
  return Boolean(pdfUrl && /egp-upload-service|downloadFile/i.test(pdfUrl))
}

/** Announcement numbers to spare, for a demo or a deliberate exception. */
function parseKeep(argv: string[]): Set<string> {
  const flag = argv.indexOf("--keep")
  if (flag < 0) return new Set()
  return new Set(
    argv
      .slice(flag + 1)
      .filter((value) => !value.startsWith("--"))
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean)
  )
}

async function main() {
  const argv = process.argv.slice(2)
  const dryRun = hasFlag(argv, "dry-run")
  const keep = parseKeep(argv)
  await connectDB()

  const drafts = await TorDraft.find(
    {},
    { announcementNo: 1, pdfUrl: 1, title: 1, qualificationRequirements: 1 }
  ).sort({ announcementNo: 1 })

  const doomed = drafts.filter(
    (draft) => !fromTenderDocument(draft.pdfUrl) && !keep.has(draft.announcementNo)
  )
  const kept = drafts.length - doomed.length

  console.log(`\n${drafts.length} draft(s): ${kept} kept, ${doomed.length} to remove`)
  if (keep.size) console.log(`spared by --keep: ${[...keep].join(", ")}`)
  console.log()
  for (const draft of doomed) {
    const rows = draft.qualificationRequirements?.length ?? 0
    console.log(`  ${draft.announcementNo}  ${String(rows).padStart(2)} requirement(s)  ${(draft.title?.th ?? "").slice(0, 46)}`)
  }

  if (dryRun) {
    console.log("\n[prune] dry run — nothing removed")
    await disconnectDB()
    return
  }

  const announcementNos = doomed.map((draft) => draft.announcementNo)
  const tors = await Tor.find({ announcementNo: { $in: announcementNos } }, { _id: 1 })
  const torIds = tors.map((tor) => tor._id)

  // Match alerts and saved answers would otherwise point at a missing TOR.
  const notifications = await Notification.deleteMany({ torId: { $in: torIds } })
  const selfChecks = await QualificationSelfCheck.deleteMany({ torId: { $in: torIds } })
  const removedTors = await Tor.deleteMany({ _id: { $in: torIds } })
  const removedDrafts = await TorDraft.deleteMany({ announcementNo: { $in: announcementNos } })

  console.log(
    `\n[prune] done — ${removedDrafts.deletedCount} draft(s), ${removedTors.deletedCount} TOR(s), ` +
      `${notifications.deletedCount} notification(s), ${selfChecks.deletedCount} self-check(s)`
  )
  console.log(`[prune] remaining: ${await TorDraft.countDocuments()} drafts, ${await Tor.countDocuments()} TORs`)
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[prune] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
