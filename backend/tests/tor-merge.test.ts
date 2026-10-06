import test from "node:test"
import assert from "node:assert/strict"
import { mergeExtraction, scaleForBudget, type ExtractedTor } from "../src/services/tor-merge"
import { ANNOUNCE_TYPES } from "../src/scraper/egp-rss"

const text = (en: string, th: string) => ({ en, th })

/** A full extraction, as the tender document would yield one. */
function extracted(overrides: Partial<ExtractedTor> = {}): ExtractedTor {
  return {
    title: text("Build a system", "จ้างพัฒนาระบบ"),
    department: text("BMA", "กรุงเทพมหานคร"),
    localOffice: text("Ratchathewi District", "เขตราชเทวี"),
    summary: text("A summary", "สรุปโครงการ"),
    deliverables: { en: ["One"], th: ["หนึ่ง"] },
    projectScale: "SMALL",
    durationDays: 365,
    method: "e-bidding",
    deadline: "",
    announcementDate: "2026-10-01T00:00:00+07:00",
    budgetBaht: 7_000_000,
    medianPriceBaht: 7_000_000,
    techTags: ["React"],
    listTags: ["Software"],
    milestones: [],
    aiConfidence: 95,
    qualificationRequirements: [],
    ...overrides,
  } as ExtractedTor
}

const tender = { from: ANNOUNCE_TYPES.draft, fullTender: true, publishedDate: "2026-09-25" }
const notice = { from: ANNOUNCE_TYPES.invitation, fullTender: false, publishedDate: "2026-10-01" }

test("a two-page notice does not blank the tender's qualifications or scope", () => {
  const set = mergeExtraction(null, extracted({ qualificationRequirements: [], summary: text("", "") }), notice)

  assert.equal("qualificationRequirements" in set, false)
  assert.equal("summary" in set, false)
  assert.equal("deliverables" in set, false)
  assert.equal("durationDays" in set, false)
})

test("a notice that carries the full tender may rewrite them", () => {
  const set = mergeExtraction(null, extracted(), { ...notice, fullTender: true })

  assert.ok("qualificationRequirements" in set)
  assert.ok("summary" in set)
  assert.equal(set.durationDays, 365)
})

test("only the invitation and its amendment state a deadline", () => {
  const deadline = "2026-11-01T16:30:00+07:00"

  assert.equal(mergeExtraction(null, extracted({ deadline }), notice).deadline, deadline)
  assert.equal("deadline" in mergeExtraction(null, extracted({ deadline }), tender), false)
})

test("the announcement date falls back to the date the feed published", () => {
  const set = mergeExtraction(null, extracted({ announcementDate: "" }), notice)

  assert.equal(set.announcementDate, "2026-10-01")
})

test("a notice's budget wins when stated, and is ignored when it is not", () => {
  assert.equal(mergeExtraction(null, extracted({ budgetBaht: 8_000_000 }), notice).budgetBaht, 8_000_000)
  assert.equal("budgetBaht" in mergeExtraction(null, extracted({ budgetBaht: 0 }), notice), false)
})

test("the scale follows the budget rather than the model", () => {
  const set = mergeExtraction(null, extracted({ budgetBaht: 30_000_000, projectScale: "SMALL" }), tender)

  assert.equal(set.projectScale, "LARGE")
  assert.equal(scaleForBudget(4_999_999), "SMALL")
  assert.equal(scaleForBudget(100_000_001), "ENTERPRISE")
})

test("status is never taken from the model", () => {
  assert.equal("status" in mergeExtraction(null, extracted(), tender), false)
})

test("an official median price survives a later tender's own figure", () => {
  const stored = { medianPriceSource: ANNOUNCE_TYPES.medianPrice, financials: { medianPriceBaht: 6_500_000 } }
  const set = mergeExtraction(stored, extracted({ medianPriceBaht: 7_000_000 }), tender)

  assert.equal((set.financials as { medianPriceBaht: number }).medianPriceBaht, 6_500_000)
})

test("a field a reviewer edited is never written again", () => {
  const set = mergeExtraction(null, extracted(), { ...tender, lockedFields: ["summary", "budgetBaht"] })

  assert.equal("summary" in set, false)
  assert.equal("budgetBaht" in set, false)
  assert.ok("title" in set)
})

test("an approved draft takes the feed's facts and nothing else", () => {
  const set = mergeExtraction(
    null,
    extracted({ deadline: "2026-11-01T16:30:00+07:00" }),
    { ...notice, reviewStatus: "approved" }
  )

  assert.deepEqual(Object.keys(set).sort(), ["announcementDate", "deadline"])
})
