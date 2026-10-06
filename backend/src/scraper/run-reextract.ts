/**
 * Re-reads the documents already on file and extracts them again.
 *
 *   npm run reextract                                    # every draft with a stored link
 *   npm run reextract "--" --dry-run                     # list what would be re-read
 *   npm run reextract "--" --only 69099316505 69099314442
 *
 * The separator is quoted because PowerShell eats a bare `--`; see utils/cli-flags.
 * Announcement numbers are separated by spaces, not commas: PowerShell reads a
 * comma-separated list as an array literal and mangles it on the way through.
 * From PowerShell, a long list is cleanest as `--only @ids`.
 *
 * For when the pipeline has changed rather than the announcement has: a new
 * prompt, a new field, a fixed parser. It works from each draft's stored
 * `pdfUrl`, so unlike `npm run ingest` it needs no RSS call and is not bound to
 * the feed's 17:01-08:29 window — but it can only reach announcements already
 * in the database, and only while the government still serves their documents.
 *
 * Every run costs a model call per announcement, so it re-extracts exactly what
 * it is asked for and never the whole collection by default.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { TorDraft } from "@/models/TorDraft.model"
import type { ExtractionContext } from "@/scraper/extract"
import { autoApproveSettings, extractAndStore } from "@/services/tor-extraction.service"
import { hasFlag } from "@/utils/cli-flags"

type DraftLike = {
  announcementNo: string
  pdfUrl?: string
  invitationUrl?: string
  announcementDate?: string
  title?: { en: string; th: string }
  department?: { en: string; th: string }
  method?: string
}

/**
 * What we already know about the announcement, handed to the model as ground
 * truth. Taken from the stored draft rather than the feed, which is the whole
 * point of this script — but the model re-reads the documents for everything
 * else, so a wrong value here cannot survive as a wrong extraction elsewhere.
 */
function contextFromDraft(draft: DraftLike): ExtractionContext {
  return {
    projectNo: draft.announcementNo,
    metadata: {
      "ชื่อโครงการ": draft.title?.th || draft.title?.en,
      "หน่วยงาน": draft.department?.th || "กรุงเทพมหานคร",
      "วิธีการจัดหา": draft.method,
      "วันที่ประกาศ": draft.announcementDate,
    },
  }
}

function parseOnly(argv: string[]): string[] {
  const flag = argv.indexOf("--only")
  if (flag < 0) return []
  return argv
    .slice(flag + 1)
    .filter((value) => !value.startsWith("--"))
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
}

async function main() {
  const argv = process.argv.slice(2)
  const dryRun = hasFlag(argv, "dry-run")
  const only = parseOnly(argv)

  await connectDB()

  const filter: Record<string, unknown> = { pdfUrl: { $nin: ["", null] } }
  if (only.length) filter.announcementNo = { $in: only }
  const drafts = await TorDraft.find(filter).sort({ announcementNo: 1 })

  console.log(`[reextract] ${drafts.length} draft(s) with a stored document link`)

  if (dryRun) {
    for (const draft of drafts) {
      const before = draft.qualificationRequirements?.length ?? 0
      console.log(`  ${draft.announcementNo}  ${before} requirement(s) now  ${draft.pdfUrl}`)
    }
    console.log("\n[reextract] dry run — no documents fetched, no model calls billed")
    await disconnectDB()
    return
  }

  const threshold = await autoApproveSettings()
  console.log(
    `[reextract] auto-approve ${threshold.enabled ? `at >= ${threshold.threshold}` : "disabled"}\n`
  )

  let succeeded = 0
  let failed = 0

  for (const draft of drafts) {
    const before = draft.qualificationRequirements?.length ?? 0
    try {
      const result = await extractAndStore({
        announcementNo: draft.announcementNo,
        pdfUrl: draft.pdfUrl!,
        // Carried through, or a re-run would drop the invitation and with it
        // both the deadline and the link a person can open.
        invitationUrl: draft.invitationUrl || undefined,
        publishedDate: draft.announcementDate ?? "",
        context: contextFromDraft(draft),
        threshold,
      })
      const after = await TorDraft.findOne(
        { announcementNo: draft.announcementNo },
        { qualificationRequirements: 1 }
      )
      const rows = after?.qualificationRequirements ?? []
      const auto = rows.filter((row) => row.autoCheckable).length
      succeeded += 1
      console.log(
        `[reextract] ${result.announcementNo} -> ${result.documents} doc(s), ` +
          `${before} -> ${rows.length} requirement(s) (${auto} automated), ` +
          `confidence ${result.aiConfidence}, ${result.outcome}`
      )
    } catch (error) {
      // One announcement's document can be withdrawn or malformed without that
      // saying anything about the next one.
      failed += 1
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[reextract] ${draft.announcementNo} -> failed: ${message}`)
    }
  }

  console.log(`\n[reextract] done — ${succeeded} re-extracted, ${failed} failed`)
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[reextract] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
