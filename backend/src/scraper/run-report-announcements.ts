/**
 * What announcements we hold, counted by type.
 *
 *   npm run report:announcements              # every stored project
 *   npm run report:announcements "--" --published   # only what /browse shows
 *
 * The separator is quoted because PowerShell eats a bare `--`; see cli-flags.
 *
 * Read-only. A project is announced several times as it moves — the plan, the
 * median price, the tender, the invitation, its amendments, the winner — and
 * each is stored as a row in `announcements`. This says which of those we
 * actually have, which is the quickest way to see what the ingest is and is
 * not reaching: a type with far fewer projects than B0 is one the feed is
 * holding back or the pipeline is dropping.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import { ANNOUNCE_TYPES, type AnnounceType } from "@/scraper/egp-rss"
import { hasFlag } from "@/utils/cli-flags"

/** In the order a project moves through them, which is how it reads best. */
const TYPE_LABELS: Record<AnnounceType, string> = {
  [ANNOUNCE_TYPES.plan]: "แผนการจัดซื้อจัดจ้าง",
  [ANNOUNCE_TYPES.medianPrice]: "ประกาศราคากลาง",
  [ANNOUNCE_TYPES.draft]: "ร่างเอกสารประกวดราคา",
  [ANNOUNCE_TYPES.invitation]: "ประกาศเชิญชวน",
  [ANNOUNCE_TYPES.invitationChanged]: "เปลี่ยนแปลงประกาศเชิญชวน",
  [ANNOUNCE_TYPES.invitationCancelled]: "ยกเลิกประกาศเชิญชวน",
  [ANNOUNCE_TYPES.winner]: "ประกาศรายชื่อผู้ชนะ",
  [ANNOUNCE_TYPES.winnerCancelled]: "ยกเลิกประกาศผู้ชนะ",
  [ANNOUNCE_TYPES.winnerChanged]: "เปลี่ยนแปลงประกาศผู้ชนะ",
}

const ORDER: AnnounceType[] = [
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

/**
 * Whether this link is the document itself rather than a portal page.
 *
 * Cancellations and award notices are published pointing at e-GP's search
 * page, which carries no file — so a count of rows overstates how much is
 * actually readable, and the two are reported apart.
 */
function isDocument(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    lower.includes("view-pdf-file") ||
    lower.includes("downloadfile") ||
    lower.includes("egp-upload-service") ||
    lower.endsWith(".pdf")
  )
}

type Row = { announceType: string; url: string }
type Project = { announcementNo: string; announcements?: Row[] }

function report(projects: readonly Project[], what: string) {
  const projectsWith = new Map<string, number>()
  const rows = new Map<string, number>()
  const readable = new Map<string, number>()

  for (const project of projects) {
    const seen = new Set<string>()
    for (const row of project.announcements ?? []) {
      rows.set(row.announceType, (rows.get(row.announceType) ?? 0) + 1)
      if (isDocument(row.url)) readable.set(row.announceType, (readable.get(row.announceType) ?? 0) + 1)
      seen.add(row.announceType)
    }
    for (const type of seen) projectsWith.set(type, (projectsWith.get(type) ?? 0) + 1)
  }

  console.log(`\n=== ${what}: ${projects.length} project(s) ===\n`)
  console.log("type  announcement                     projects   rows   readable")
  for (const type of ORDER) {
    const n = projectsWith.get(type) ?? 0
    console.log(
      `${type.padEnd(5)} ${TYPE_LABELS[type].padEnd(30)} ${String(n).padStart(8)} ${String(
        rows.get(type) ?? 0
      ).padStart(6)} ${String(readable.get(type) ?? 0).padStart(10)}`
    )
  }

  // Which types a project has, together — the shape that decides whether it can
  // be extracted at all (needs a B0) and published (needs a D0 or D2).
  const shapes = new Map<string, number>()
  for (const project of projects) {
    const types = [...new Set((project.announcements ?? []).map((r) => r.announceType))]
    const key = ORDER.filter((t) => types.includes(t)).join("+") || "(none)"
    shapes.set(key, (shapes.get(key) ?? 0) + 1)
  }
  console.log("\ncombinations held, commonest first:")
  for (const [shape, n] of [...shapes].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`  ${String(n).padStart(4)}  ${shape}`)
  }
}

async function main() {
  const publishedOnly = hasFlag(process.argv.slice(2), "published")
  await connectDB()

  if (publishedOnly) {
    const tors = (await Tor.find({}, { announcementNo: 1, announcements: 1 }).lean()) as unknown as Project[]
    report(tors, "published TORs")
  } else {
    const drafts = (await TorDraft.find({}, { announcementNo: 1, announcements: 1 }).lean()) as unknown as Project[]
    report(drafts, "stored drafts")
  }

  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[docs] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
