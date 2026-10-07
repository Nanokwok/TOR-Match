import test from "node:test"
import assert from "node:assert/strict"
import { paginate } from "../src/utils/paginate"

const list = Array.from({ length: 25 }, (_, index) => index + 1)

test("paginate returns the requested slice and the totals", () => {
  const page = paginate(list, 2, 10)
  assert.deepEqual(page.items, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
  assert.equal(page.total, 25)
  assert.equal(page.page, 2)
  assert.equal(page.pageSize, 10)
  assert.equal(page.totalPages, 3)
})

test("the last page holds the remainder", () => {
  assert.deepEqual(paginate(list, 3, 10).items, [21, 22, 23, 24, 25])
})

test("a page past the end lands on the last page", () => {
  const page = paginate(list, 99, 10)
  assert.equal(page.page, 3)
  assert.deepEqual(page.items, [21, 22, 23, 24, 25])
})

test("missing or bad input falls back to page 1 of 10", () => {
  assert.equal(paginate(list, undefined, undefined).page, 1)
  assert.equal(paginate(list, "abc", "-4").pageSize, 10)
  assert.equal(paginate(list, 0, 0).page, 1)
})

test("page size is capped", () => {
  assert.equal(paginate(list, 1, 5000).pageSize, 50)
})

test("an empty list is one empty page", () => {
  const page = paginate([], 1, 10)
  assert.deepEqual(page.items, [])
  assert.equal(page.totalPages, 1)
  assert.equal(page.total, 0)
})
