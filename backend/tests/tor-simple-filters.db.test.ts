import test, { after, afterEach, before } from "node:test"
import assert from "node:assert/strict"

import { Tor } from "../src/models/Tor.model"
import { matchesSimpleFilters, type SimpleTorFilters } from "../src/services/tor-filters"
import { startMemoryDb } from "./helpers/memory-db"

/**
 * The listing used to ask MongoDB for these filters; it now applies them to a
 * cached list. This runs both on the same documents and requires the same
 * answer, so the move cannot have changed what a search finds.
 */

let db: Awaited<ReturnType<typeof startMemoryDb>>

before(async () => {
  db = await startMemoryDb()
})
afterEach(() => db.clear())
after(() => db.stop())

/** The query the controller built before the cache, kept here as the reference. */
function mongoFilter(filters: SimpleTorFilters) {
  const filter: Record<string, unknown> = {}
  if (filters.status) filter.status = filters.status
  const and: Record<string, unknown>[] = []
  if (filters.department) {
    and.push({ $or: [{ "department.en": filters.department }, { "department.en": "", "department.th": filters.department }] })
  }
  if (filters.budget) filter.budgetBaht = { $gte: filters.budget.min, $lt: filters.budget.max }
  if (filters.keyword?.trim()) {
    const q = filters.keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const localizedFields = ["title", "department", "localOffice", "summary"]
    and.push({
      $or: [
        ...localizedFields.flatMap((field) => [
          { [`${field}.en`]: { $regex: q, $options: "i" } },
          { [`${field}.th`]: { $regex: q, $options: "i" } },
        ]),
        { announcementNo: { $regex: q, $options: "i" } },
        { techTags: { $regex: q, $options: "i" } },
      ],
    })
  }
  if (and.length) filter.$and = and
  return filter
}

let counter = 0
const text = (en: string, th = "") => ({ en, th })

async function insert(overrides: Record<string, unknown>) {
  counter += 1
  await Tor.collection.insertOne({
    announcementNo: `no-${counter}`,
    title: text("Plain title"),
    department: text("Dept A", "สำนัก ก"),
    localOffice: text("Office"),
    summary: text("Summary"),
    status: "open",
    budgetBaht: 1_000_000,
    techTags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })
}

async function seed() {
  await insert({ title: text("Portal Modernisation", "ปรับปรุงพอร์ทัล"), techTags: ["React", "Node.js"], budgetBaht: 2_999_999 })
  await insert({ title: text("Hospital meals"), status: "closed", budgetBaht: 3_000_000 })
  await insert({ title: text("C++ firmware"), budgetBaht: 5_999_999, summary: text("embedded, a.b and (x)") })
  await insert({ department: text("", "สำนักงานเขต"), title: text("", "ระบบสารสนเทศ"), budgetBaht: 6_000_000 })
  await insert({ announcementNo: "BMA-2026-0042", status: "awarded", budgetBaht: 12_000_000 })
  await insert({ techTags: ["Python"], localOffice: text("District 7", "เขต 7"), status: "closing-soon" })
  await insert({ department: text("Dept B", "สำนัก ข"), summary: text("Needs ISO 27001") })
  await insert({ budgetBaht: undefined, title: text("No budget stated") })
}

const CASES: [string, SimpleTorFilters][] = [
  ["no filters", {}],
  ["status", { status: "open" }],
  ["status with no match", { status: "draft" }],
  ["department by English name", { department: "Dept A" }],
  ["department of a Thai-only TOR", { department: "สำนักงานเขต" }],
  ["department's Thai name does not match an English one", { department: "สำนัก ก" }],
  ["budget under 3m", { budget: { min: 0, max: 3_000_000 } }],
  ["budget 3m-6m (upper bound excluded)", { budget: { min: 3_000_000, max: 6_000_000 } }],
  ["budget over 10m", { budget: { min: 10_000_000, max: Number.POSITIVE_INFINITY } }],
  ["keyword in a title, any case", { keyword: "PORTAL" }],
  ["keyword in Thai", { keyword: "ระบบ" }],
  ["keyword in the summary", { keyword: "iso 27001" }],
  ["keyword in the office", { keyword: "district" }],
  ["keyword in the announcement number", { keyword: "bma-2026" }],
  ["keyword in a tag", { keyword: "node" }],
  ["keyword with regex characters, taken literally", { keyword: "C++" }],
  ["keyword with a dot, which is not 'any character'", { keyword: "a.b" }],
  ["keyword with brackets", { keyword: "(x)" }],
  ["keyword padded with spaces", { keyword: "  python  " }],
  ["keyword that matches nothing", { keyword: "zzzz" }],
  ["blank keyword", { keyword: "   " }],
  ["everything at once", { status: "open", department: "Dept A", budget: { min: 0, max: 3_000_000 }, keyword: "portal" }],
]

for (const [name, filters] of CASES) {
  test(`the same TORs as MongoDB: ${name}`, async () => {
    await seed()
    const all = await Tor.find({})

    const fromMongo = (await Tor.find(mongoFilter(filters))).map((tor) => String(tor._id)).sort()
    const inProcess = all.filter((tor) => matchesSimpleFilters(tor, filters)).map((tor) => String(tor._id)).sort()

    assert.deepEqual(inProcess, fromMongo)
  })
}

test("the cases above are not all empty or all full", async () => {
  await seed()
  const all = await Tor.find({})
  const sizes = CASES.map(([, filters]) => all.filter((tor) => matchesSimpleFilters(tor, filters)).length)
  assert.ok(sizes.some((n) => n === 0))
  assert.ok(sizes.some((n) => n > 0 && n < all.length))
})
