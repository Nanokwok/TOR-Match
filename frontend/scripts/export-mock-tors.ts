/**
 * Dumps the mock TOR dataset to JSON so the backend can seed MongoDB from it
 * without importing across workspaces (different path aliases, different builds).
 *
 * Run from the frontend workspace:
 *   npx tsx scripts/export-mock-tors.ts
 *
 * Re-run whenever the mock data changes; commit the generated file.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

import { getMockTors } from "@/server/db/mock/tors"

const OUTPUT = resolve(
  import.meta.dirname,
  "../../backend/src/seed/tors.seed.json"
)

/**
 * `eligible` and `bookmarked` are per-user view state, not TOR data — they are
 * derived per request, so they never belong in the database.
 */
function toSeedDocument(tor: ReturnType<typeof getMockTors>[number]) {
  const { id: _id, eligible: _eligible, bookmarked: _bookmarked, ...rest } = tor
  return rest
}

const documents = getMockTors().map(toSeedDocument)

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, `${JSON.stringify(documents, null, 2)}\n`, "utf8")

console.log(`[export] wrote ${documents.length} TOR documents -> ${OUTPUT}`)