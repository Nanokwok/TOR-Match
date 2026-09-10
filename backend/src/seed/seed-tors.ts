/**
 * Backend-owned TOR fixtures with structured matching criteria.
 * npm run seed -- --check         inspect counts without writing
 * npm run seed -- --criteria-only update requirements on existing fixture TORs only
 * npm run seed                   upsert fixture documents by announcementNo
 * npm run seed -- --fresh         explicitly delete all TORs before upserting
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { connectDB, disconnectDB } from "@/config/db"
import { Tor } from "@/models/Tor.model"

type SeedTor = Record<string, unknown> & { announcementNo: string }

function loadSeed(): SeedTor[] {
  const file = resolve(__dirname, "tors.seed.json")
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"))

  if (!Array.isArray(parsed)) {
    throw new Error(`${file} must contain an array of TOR documents`)
  }
  return parsed as SeedTor[]
}

async function main() {
  const fresh = process.argv.includes("--fresh")
  const documents = loadSeed()

  for (const document of documents) await new Tor(document).validate()
  await connectDB()

  if (process.argv.includes("--check")) {
    const existing = await Tor.find().select("announcementNo qualificationRequirements").lean()
    console.log(JSON.stringify({
      total: existing.length,
      fixtureTors: existing.filter((tor) => documents.some((seed) => seed.announcementNo === tor.announcementNo)).length,
      withoutCriteria: existing.filter((tor) => !tor.qualificationRequirements.length || tor.qualificationRequirements.some((row) => !row.criteria)).length,
    }))
    await disconnectDB()
    return
  }
  if (process.argv.includes("--criteria-only")) {
    // Already validated against the schema (including per-row `criteria`) by
    // Tor(document).validate() above — this cast is just Mongoose's bulkWrite
    // typing not following through JSON-sourced `unknown` fields.
    const result = await Tor.bulkWrite(documents.map((document) => ({
      updateOne: {
        filter: { announcementNo: document.announcementNo },
        update: { $set: { qualificationRequirements: document.qualificationRequirements as never } },
        upsert: false,
      },
    })))
    console.log(`[seed] updated criteria for ${result.modifiedCount} existing fixture TOR(s); preserved IDs and other fields`)
    await disconnectDB()
    return
  }

  if (fresh) {
    const { deletedCount } = await Tor.deleteMany({})
    console.log(`[seed] --fresh: removed ${deletedCount} existing TOR(s)`)
  }

  // Upsert by announcementNo (the natural key) so re-running never duplicates.
  const result = await Tor.bulkWrite(
    documents.map((document) => ({
      updateOne: {
        filter: { announcementNo: document.announcementNo },
        update: { $set: document },
        upsert: true,
      },
    })),
    { ordered: false }
  )

  console.log(
    `[seed] inserted ${result.upsertedCount}, updated ${result.modifiedCount}, total in DB ${await Tor.countDocuments()}`
  )

  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[seed] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})