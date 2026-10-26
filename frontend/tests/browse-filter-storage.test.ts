import test from "node:test"
import assert from "node:assert/strict"

import { parseStoredBrowseFilters } from "../src/lib/browse-filter-storage"
import { DEFAULT_BROWSE_SORT, EMPTY_DETAIL_FILTERS } from "../src/lib/browse-filters"

test("nothing saved, or text that is not JSON, gives nothing to restore", () => {
  assert.equal(parseStoredBrowseFilters(null), null)
  assert.equal(parseStoredBrowseFilters(""), null)
  assert.equal(parseStoredBrowseFilters("{not json"), null)
  assert.equal(parseStoredBrowseFilters("42"), null)
})

test("saved filters come back as they were saved", () => {
  const raw = JSON.stringify({
    sort: "budget-desc",
    budgetRange: "3m-6m",
    status: "closed",
    department: "Digital Office",
    detail: { ...EMPTY_DETAIL_FILTERS, projectScales: ["LARGE"], budgetMinThb: "100" },
  })
  const restored = parseStoredBrowseFilters(raw)
  assert.equal(restored?.sort, "budget-desc")
  assert.equal(restored?.budgetRange, "3m-6m")
  assert.equal(restored?.status, "closed")
  assert.equal(restored?.department, "Digital Office")
  assert.deepEqual(restored?.detail.projectScales, ["LARGE"])
  assert.equal(restored?.detail.budgetMinThb, "100")
})

test("values that are not valid fall back to the defaults instead of breaking the page", () => {
  const restored = parseStoredBrowseFilters(JSON.stringify({ sort: "random", status: "weird", budgetRange: 5, department: null }))
  assert.equal(restored?.sort, DEFAULT_BROWSE_SORT)
  assert.equal(restored?.status, "all")
  assert.equal(restored?.budgetRange, "all")
  assert.equal(restored?.department, "all")
})

test("a saved detail filter of the wrong shape is replaced, and a missing one is filled in", () => {
  const restored = parseStoredBrowseFilters(
    JSON.stringify({ detail: { projectScales: "LARGE", localOffices: 5, budgetMinThb: "50" } })
  )
  assert.deepEqual(restored?.detail.projectScales, [])
  assert.deepEqual(restored?.detail.localOffices, [])
  assert.equal(restored?.detail.budgetMinThb, "50")
  assert.equal(restored?.detail.fiscalYear, EMPTY_DETAIL_FILTERS.fiscalYear)
})
