/**
 * Closes TORs whose submission deadline has passed.
 *
 *   npm run age:status                  # apply
 *   npm run age:status "--" --dry-run   # list them, change nothing
 *
 * The separator is quoted because PowerShell eats a bare `--`; see cli-flags.
 *
 * Run on a schedule beside the ingest — a deadline passes whether or not any
 * announcement was published that day. The ingest also calls this at the end of
 * its own run, so a nightly ingest keeps /browse honest without this script;
 * it exists for a run of its own, and for inspecting what would change.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { ageStatuses } from "@/services/deadline-status.service"
import { hasFlag } from "@/utils/cli-flags"

async function main() {
  const dryRun = hasFlag(process.argv.slice(2), "dry-run")
  await connectDB()

  const changes = await ageStatuses({ dryRun })

  if (!changes.length) {
    console.log("[age] every published TOR's status already matches its deadline")
    await disconnectDB()
    return
  }

  for (const change of changes) {
    console.log(`  ${change.announcementNo}  ${change.from} -> ${change.to}  (${change.deadline})`)
  }
  const closed = changes.filter((change) => change.to === "closed").length
  console.log(
    `\n[age] ${closed} closed, ${changes.length - closed} closing soon` +
      `${dryRun ? " — dry run, nothing changed" : ""}`
  )

  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[age] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
