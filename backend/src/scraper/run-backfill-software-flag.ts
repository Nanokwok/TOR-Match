/**
 * Labels stored TORs with the software heuristic.
 *
 *   npm run backfill:software                  # apply
 *   npm run backfill:software "--" --dry-run   # count, change nothing
 *
 * The separator is quoted because PowerShell eats a bare `--`; see cli-flags.
 *
 * Ingestion used to discard everything the heuristic said no to, so the flag
 * did not need storing — everything on file was software by definition. Now
 * that it is a label rather than a gate, what is already stored has to be
 * labelled too, or a "software only" browse would show nothing.
 *
 * Reads the Thai title, which is what the heuristic was written against; the
 * English one is a translation and can lose the terms it keys on.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import { titleSuggestsSoftware } from "@/scraper/software-filter"
import { hasFlag } from "@/utils/cli-flags"

type Row = { _id: unknown; announcementNo: string; title?: { th?: string; en?: string }; softwareRelated?: boolean }

async function label(
  rows: readonly Row[],
  what: string,
  dryRun: boolean,
  save: (id: unknown, value: boolean) => Promise<unknown>
) {
  let changed = 0
  let software = 0

  for (const row of rows) {
    const title = row.title?.th?.trim() || row.title?.en?.trim() || ""
    const value = titleSuggestsSoftware({ title })
    if (value) software += 1
    if (value === (row.softwareRelated ?? false)) continue
    changed += 1
    if (!dryRun) await save(row._id, value)
  }

  console.log(`[software] ${what}: ${software}/${rows.length} look like software, ${changed} relabelled`)
}

async function main() {
  const dryRun = hasFlag(process.argv.slice(2), "dry-run")
  await connectDB()

  const projection = { announcementNo: 1, title: 1, softwareRelated: 1 }
  const drafts = (await TorDraft.find({}, projection).lean()) as unknown as Row[]
  await label(drafts, "drafts", dryRun, (id, value) =>
    TorDraft.updateOne({ _id: id }, { $set: { softwareRelated: value } })
  )

  const tors = (await Tor.find({}, projection).lean()) as unknown as Row[]
  await label(tors, "published", dryRun, (id, value) =>
    Tor.updateOne({ _id: id }, { $set: { softwareRelated: value } })
  )

  if (dryRun) console.log("\n[software] dry run — nothing changed")
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[software] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
