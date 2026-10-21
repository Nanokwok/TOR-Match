/**
 * Records the agency on TORs ingested before the ingest read more than one.
 *
 *   npm run backfill:agency                  # apply
 *   npm run backfill:agency "--" --dry-run   # count, change nothing
 *
 * The separator is quoted because PowerShell eats a bare `--`; see cli-flags.
 *
 * Everything stored before this came from the Bangkok feed, because that was
 * the only agency the ingest read — so the code is known rather than guessed.
 * Without it a filter by agency would silently drop every TOR we already have.
 *
 * Only fills what is empty: a record that already names an agency was written
 * by an ingest that knew which feed it read, and is not second-guessed here.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { agencyFor } from "@/domain/egp-agencies"
import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import { hasFlag } from "@/utils/cli-flags"

const BANGKOK = "3100001"

async function main() {
  const dryRun = hasFlag(process.argv.slice(2), "dry-run")
  const agency = agencyFor(BANGKOK)
  if (!agency) throw new Error(`${BANGKOK} is not in the agency registry`)

  await connectDB()

  const unset = { $or: [{ agencyDeptId: { $exists: false } }, { agencyDeptId: "" }] }
  const [drafts, tors] = await Promise.all([
    TorDraft.countDocuments(unset),
    Tor.countDocuments(unset),
  ])
  console.log(`[agency] ${drafts} draft(s) and ${tors} published TOR(s) have no agency recorded`)

  if (dryRun) {
    console.log(`[agency] dry run — they would be set to ${agency.deptId} ${agency.name}`)
    await disconnectDB()
    return
  }

  const set = { $set: { agencyDeptId: agency.deptId, agencyName: agency.name } }
  await Promise.all([TorDraft.updateMany(unset, set), Tor.updateMany(unset, set)])
  console.log(`[agency] recorded ${agency.deptId} ${agency.name} on ${drafts + tors} record(s)`)

  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[agency] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
