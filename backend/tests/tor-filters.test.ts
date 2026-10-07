import test from "node:test"
import assert from "node:assert/strict"
import { detailFiltersSchema, matchesDetailFilters } from "../src/services/tor-filters"

/** A TOR that passes every filter unless the case changes something. */
function tor(overrides: Record<string, unknown> = {}) {
  return {
    projectScale: "SMALL" as const,
    durationDays: 90,
    budgetBaht: 2_000_000,
    method: "e-bidding" as const,
    deadline: "2026-10-30T12:00:00+07:00",
    announcementDate: "2026-10-01T00:00:00+07:00",
    localOffice: { en: "Bangkok" },
    ...overrides,
  }
}

const filters = (overrides: Record<string, unknown> = {}) =>
  detailFiltersSchema.parse(overrides)

test("software-only keeps the labelled announcements and drops the rest", () => {
  // Ingestion stores every kind of procurement now, so the label is what keeps
  // refuse collection and hospital meals out of a software search.
  assert.equal(matchesDetailFilters(tor({ softwareRelated: true }), filters({ softwareOnly: true })), true)
  assert.equal(matchesDetailFilters(tor({ softwareRelated: false }), filters({ softwareOnly: true })), false)
})

test("an unlabelled TOR counts as not software rather than throwing", () => {
  // Anything stored before the flag existed has no value for it.
  assert.equal(matchesDetailFilters(tor(), filters({ softwareOnly: true })), false)
})

test("software-only off shows everything, labelled or not", () => {
  assert.equal(matchesDetailFilters(tor({ softwareRelated: false }), filters()), true)
  assert.equal(matchesDetailFilters(tor({ softwareRelated: true }), filters()), true)
})

test("the filter defaults to off, so an existing client sees no change", () => {
  assert.equal(filters().softwareOnly, false)
})
