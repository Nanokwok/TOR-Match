/**
 * Takes back TORs that were published before their invitation existed.
 *
 *   npm run unpublish:pending                # apply
 *   npm run unpublish:pending "--" --dry-run # list them, change nothing
 *
 * The separator is quoted because PowerShell eats a bare `--`; see utils/cli-flags.
 *
 * A project is announced as B0 ร่างเอกสารประกวดราคา a week or two before its
 * D0 ประกาศเชิญชวน. The draft tender carries the qualifications but no closing
 * date, because bidding has not opened — so a TOR published from it alone shows
 * a bidder "กำหนดยื่นข้อเสนอ -" and nothing they can act on.
 *
 * Publishing now waits for the invitation (see publishBlocker). This removes
 * the ones that went out under the old rule: the draft stays, keeps its
 * extracted content, and is published by the next ingest that reads its D0.
 *
 * Bookmarks and notifications pointing at a withdrawn TOR are reported rather
 * than deleted — a card that loses its TOR is a smaller problem than a silently
 * deleted bookmark, and both disappear anyway when the TOR returns under the
 * same announcement number.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { Notification } from "@/models/Notification.model"
import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import { WorkspaceCard } from "@/models/WorkspaceCard.model"
import { hasInvitation } from "@/services/tor-publish.service"
import { hasFlag } from "@/utils/cli-flags"

async function main() {
  const dryRun = hasFlag(process.argv.slice(2), "dry-run")
  await connectDB()

  const published = await Tor.find({}, { announcementNo: 1, title: 1, announcements: 1 }).lean()
  const pending = published.filter((tor) => !hasInvitation(tor as never))

  console.log(
    `[unpublish] ${pending.length} of ${published.length} published TOR(s) have no invitation yet`
  )
  if (!pending.length) {
    await disconnectDB()
    return
  }

  const ids = pending.map((tor) => tor._id)
  const [cards, notifications] = await Promise.all([
    WorkspaceCard.countDocuments({ torId: { $in: ids } }),
    Notification.countDocuments({ torId: { $in: ids } }),
  ])

  for (const tor of pending) {
    const types = (tor.announcements ?? []).map((row) => row.announceType).join(", ") || "none"
    console.log(`  ${tor.announcementNo}  [${types}]  ${(tor.title?.th ?? "").slice(0, 52)}`)
  }
  if (cards || notifications) {
    console.log(`[unpublish] ${cards} workspace card(s) and ${notifications} notification(s) point at them`)
  }

  if (dryRun) {
    console.log("\n[unpublish] dry run — nothing changed")
    await disconnectDB()
    return
  }

  const announcementNos = pending.map((tor) => tor.announcementNo)
  const { deletedCount } = await Tor.deleteMany({ _id: { $in: ids } })
  // The draft is what the next ingest updates, so its record of having been
  // published has to go with the TOR itself.
  await TorDraft.updateMany(
    { announcementNo: { $in: announcementNos } },
    { $set: { publishedTorId: null, publishedAt: null } }
  )

  console.log(`\n[unpublish] withdrew ${deletedCount} TOR(s); their drafts wait for D0`)
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[unpublish] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
