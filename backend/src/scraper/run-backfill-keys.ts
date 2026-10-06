/**
 * Gives stored TORs a shared vocabulary key and a rule the matcher can run.
 *
 *   npm run backfill:keys                # apply
 *   npm run backfill:keys "--" --dry-run # print the diff, touch nothing
 *
 * The separator is quoted because PowerShell eats a bare `--`; see utils/cli-flags.
 *
 * Every TOR extracted before the vocabulary existed carries qualifications with
 * no `criteria`, and the matcher requires one — so each of those rows reports
 * "insufficient data" no matter how complete the bidder's profile is. This
 * recovers what can be recovered from the Thai text that was already stored.
 *
 * It never invents a threshold: a clause whose figure cannot be read becomes a
 * manual row, which asks the bidder rather than guessing on their behalf.
 *
 * Run this BEFORE any self-check answers exist. It reassigns requirement ids
 * from `req-<hash>` to the readable `key`/`key-2` form, and a stored answer
 * points at the old id.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import {
  repairQualifications,
  type ExtractedQualification,
} from "@/scraper/qualification-repair"
import { hasFlag } from "@/utils/cli-flags"

type StoredRow = {
  id: string
  key?: string
  requirement: { en: string; th: string }
  torCriteria: { en: string; th: string }
  autoCheckable?: boolean
  criteria?: unknown
}

/**
 * Re-runs the extraction repair over what is already stored.
 *
 * `thresholdThb: 0` is the whole point: there is no model answer to reconcile
 * here, so the figure must come out of the document text or not at all.
 */
function rebuild(rows: readonly StoredRow[]) {
  const entries: ExtractedQualification[] = rows.map((row) => ({
    key: row.key ?? "manual",
    requirement: row.requirement,
    torCriteria: row.torCriteria,
    thresholdThb: 0,
    certificationIds: [],
    certificationMode: "any",
  }))
  return repairQualifications(entries)
}

function describe(row: { criteria: { type: string } & Record<string, unknown> }): string {
  const { type, ...rest } = row.criteria
  const detail = Object.entries(rest)
    .map(([name, value]) => `${name}=${Array.isArray(value) ? value.join("/") : String(value)}`)
    .join(" ")
  return detail ? `${type} ${detail}` : type
}

/**
 * What this script needs of a document, so the same pass can run over both the
 * published collection and the draft one — whose Mongoose model types are
 * separate and have no common callable `find`.
 */
type BackfillDoc = {
  announcementNo: string
  qualificationRequirements: unknown
  set(values: Record<string, unknown>): unknown
  save(): Promise<unknown>
}

async function backfill(label: string, documents: BackfillDoc[], dryRun: boolean) {
  let changed = 0
  const tally = new Map<string, number>()

  for (const document of documents) {
    const rows = document.qualificationRequirements as unknown as StoredRow[]
    if (!rows?.length) continue

    // Already keyed and ruled: a re-run must be a no-op, so the script stays
    // safe to run again after a partial failure.
    const alreadyDone = rows.every((row) => row.key && row.criteria)
    if (alreadyDone) continue

    const rebuilt = rebuild(rows)
    for (const row of rebuilt) tally.set(row.key, (tally.get(row.key) ?? 0) + 1)

    console.log(`\n[backfill] ${label} ${document.announcementNo}`)
    for (const [index, row] of rebuilt.entries()) {
      const before = rows[index]
      console.log(
        `  ${before.id.padEnd(16)} -> ${row.id.padEnd(20)} ${describe(row)}` +
          `  ${before.requirement.th.slice(0, 40)}`
      )
    }

    if (!dryRun) {
      document.set({ qualificationRequirements: rebuilt })
      await document.save()
    }
    changed += 1
  }

  const summary = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${key} ${count}`)
    .join(", ")
  console.log(`\n[backfill] ${label}: ${changed} of ${documents.length} rewritten — ${summary || "no rows"}`)
}

async function main() {
  const dryRun = hasFlag(process.argv.slice(2), "dry-run")
  await connectDB()

  const projection = { announcementNo: 1, qualificationRequirements: 1 }
  await backfill("draft", await TorDraft.find({}, projection), dryRun)
  await backfill("tor  ", await Tor.find({}, projection), dryRun)

  console.log(dryRun ? "\n[backfill] dry run — nothing was written" : "\n[backfill] done")
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[backfill] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
