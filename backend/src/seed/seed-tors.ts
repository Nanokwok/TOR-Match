/**
 * Seeds MongoDB with the TOR dataset exported from the frontend mocks.
 *
 *   npm run seed          # upsert (safe to re-run)
 *   npm run seed -- --fresh   # delete every TOR first, then insert
 *
 * Regenerate tors.seed.json from the frontend workspace with:
 *   npx tsx scripts/export-mock-tors.ts
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

  await connectDB()

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