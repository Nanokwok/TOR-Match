/**
 * Rewrites Thai numerals as Arabic ones in stored TORs.
 *
 *   npm run normalize:digits                  # apply
 *   npm run normalize:digits "--" --dry-run   # list what would change
 *
 * The separator is quoted because PowerShell eats a bare `--`; see cli-flags.
 *
 * The ingest converts on the way in (see utils/thai-digits), but anything
 * extracted before that does not, and a TOR reading "จำนวน ๑๗ เครื่อง" does not
 * fix itself — nothing re-reads a project whose announcements have all been
 * seen. This is the one-off for what is already stored.
 *
 * Only the fields that carry announcement text are touched, named explicitly
 * rather than walking the whole document: a document from `.lean()` still holds
 * ObjectIds and Dates, and a recursive walk would take them apart.
 */
import { connectDB, disconnectDB } from "@/config/db"
import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import { hasThaiDigits, toArabicDigitsDeep } from "@/utils/thai-digits"
import { hasFlag } from "@/utils/cli-flags"

/** Everything a person reads. Numbers and dates hold no Thai numerals. */
const TEXT_FIELDS = [
  "title",
  "department",
  "localOffice",
  "summary",
  "deliverables",
  "techTags",
  "listTags",
  "qualificationRequirements",
  "financials",
  "announcements",
] as const

/** Only what this needs, so the two models do not have to share a type. */
type TextDoc = { _id: unknown; announcementNo: string } & Record<string, unknown>

const PROJECTION = {
  announcementNo: 1,
  ...Object.fromEntries(TEXT_FIELDS.map((field) => [field, 1])),
}

async function normalize(
  docs: readonly TextDoc[],
  label: string,
  dryRun: boolean,
  save: (id: unknown, update: Record<string, unknown>) => Promise<unknown>
): Promise<number> {
  let changed = 0

  for (const doc of docs) {
    const update: Record<string, unknown> = {}
    const touched: string[] = []

    for (const field of TEXT_FIELDS) {
      const value = doc[field]
      if (value === undefined || value === null) continue
      // Cheap guard first: converting and deep-comparing every field of every
      // document would cost more than the scan is worth.
      if (!hasThaiDigits(JSON.stringify(value))) continue
      update[field] = toArabicDigitsDeep(value)
      touched.push(field)
    }

    if (!touched.length) continue
    changed += 1
    const title = (doc as { title?: { th?: string } }).title?.th ?? ""
    console.log(`  ${label} ${doc.announcementNo}  ${touched.join(", ")}`)
    console.log(`      ${title.slice(0, 64)}`)

    if (!dryRun) await save(doc._id, update)
  }

  return changed
}

async function main() {
  const dryRun = hasFlag(process.argv.slice(2), "dry-run")
  await connectDB()

  const draftDocs = (await TorDraft.find({}, PROJECTION).lean()) as unknown as TextDoc[]
  const drafts = await normalize(draftDocs, "draft", dryRun, (id, update) =>
    TorDraft.updateOne({ _id: id }, { $set: update })
  )

  const torDocs = (await Tor.find({}, PROJECTION).lean()) as unknown as TextDoc[]
  const tors = await normalize(torDocs, "tor  ", dryRun, (id, update) =>
    Tor.updateOne({ _id: id }, { $set: update })
  )

  console.log(
    `\n[digits] ${drafts} draft(s) and ${tors} published TOR(s) ${
      dryRun ? "would be rewritten — dry run, nothing changed" : "rewritten"
    }`
  )
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[digits] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
