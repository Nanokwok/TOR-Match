import test from "node:test"
import assert from "node:assert/strict"

import {
  BROWSE_PAGE_SIZE,
  BROWSE_SORTS,
  DEFAULT_BROWSE_SORT,
  EMPTY_DETAIL_FILTERS,
  cloneDetailFilters,
  countActiveDetailFilters,
  getActiveDetailFilterChips,
} from "../src/lib/browse-filters"

test("the default filters are empty and count as none active", () => {
  assert.equal(countActiveDetailFilters(EMPTY_DETAIL_FILTERS), 0)
  assert.deepEqual(getActiveDetailFilterChips(EMPTY_DETAIL_FILTERS), [])
})

test("each kind of filter counts once, however many values it holds", () => {
  assert.equal(countActiveDetailFilters({ ...EMPTY_DETAIL_FILTERS, projectScales: ["SMALL", "LARGE"] }), 1)
  assert.equal(countActiveDetailFilters({ ...EMPTY_DETAIL_FILTERS, budgetMinThb: "1000", budgetMaxThb: "9000" }), 1)
  assert.equal(countActiveDetailFilters({ ...EMPTY_DETAIL_FILTERS, budgetMaxThb: "9000" }), 1)
  assert.equal(countActiveDetailFilters({ ...EMPTY_DETAIL_FILTERS, localOffices: ["a", "b", "c"] }), 1)
  assert.equal(countActiveDetailFilters({ ...EMPTY_DETAIL_FILTERS, deadlinePreset: "7-days" }), 1)
  assert.equal(countActiveDetailFilters({ ...EMPTY_DETAIL_FILTERS, fiscalYear: "2569" }), 1)
})

test("different kinds add up", () => {
  const filters = {
    ...EMPTY_DETAIL_FILTERS,
    projectScales: ["MEDIUM" as const],
    procurementMethods: ["e-bidding" as const],
    durationPresets: ["under-3m" as const],
    fiscalYear: "2569",
  }
  assert.equal(countActiveDetailFilters(filters), 4)
})

test("a budget made only of spaces is not an active filter", () => {
  assert.equal(countActiveDetailFilters({ ...EMPTY_DETAIL_FILTERS, budgetMinThb: "   " }), 0)
})

test("an active filter gets a chip and a cleared one does not", () => {
  const chips = getActiveDetailFilterChips({ ...EMPTY_DETAIL_FILTERS, projectScales: ["LARGE"], fiscalYear: "2569" })
  assert.ok(chips.length >= 2)
  assert.ok(chips.every((chip) => chip.id && chip.label))
  assert.equal(new Set(chips.map((chip) => chip.id)).size, chips.length, "chip ids are unique")
})

test("chip labels come from the translator when one is given", () => {
  const chips = getActiveDetailFilterChips(
    { ...EMPTY_DETAIL_FILTERS, projectScales: ["LARGE"] },
    (key, params) => `T(${key}${params ? JSON.stringify(params) : ""})`
  )
  const scale = chips.find((chip) => chip.id === "scale")
  assert.ok(scale?.label.startsWith("T(browse.chipScale"))
  assert.ok(scale?.label.includes("T(browse.scaleLarge)"))
})

test("cloning gives lists of their own, so editing the copy leaves the original alone", () => {
  const original = { ...EMPTY_DETAIL_FILTERS, projectScales: ["SMALL" as const], localOffices: ["a"] }
  const copy = cloneDetailFilters(original)
  copy.projectScales.push("LARGE")
  copy.localOffices.push("b")
  assert.deepEqual(original.projectScales, ["SMALL"])
  assert.deepEqual(original.localOffices, ["a"])
})

test("the browse defaults are sensible and the default sort is one of the offered sorts", () => {
  assert.equal(BROWSE_PAGE_SIZE, 10)
  assert.ok(BROWSE_SORTS.includes(DEFAULT_BROWSE_SORT))
  assert.equal(DEFAULT_BROWSE_SORT, "opened-desc")
})
