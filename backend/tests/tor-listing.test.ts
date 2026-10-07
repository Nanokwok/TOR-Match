import test from "node:test"
import assert from "node:assert/strict"
import { DEFAULT_TOR_SORT, isOpenForBids, isTorSort, sortTors } from "../src/utils/tor-listing"

const now = new Date("2026-10-07T00:00:00Z")

test("a TOR is open when its status is open and the deadline is still ahead", () => {
  assert.equal(isOpenForBids({ status: "open", deadline: "2026-10-20T12:00:00+07:00" }, now), true)
  assert.equal(isOpenForBids({ status: "closing-soon", deadline: "2026-10-08T12:00:00+07:00" }, now), true)
})

test("a passed deadline ends it even when the stored status still says open", () => {
  assert.equal(isOpenForBids({ status: "open", deadline: "2026-10-01T12:00:00+07:00" }, now), false)
})

test("closed, awarded and draft TORs are not open", () => {
  assert.equal(isOpenForBids({ status: "closed", deadline: "2026-12-01T12:00:00+07:00" }, now), false)
  assert.equal(isOpenForBids({ status: "awarded", deadline: "2026-12-01T12:00:00+07:00" }, now), false)
  assert.equal(isOpenForBids({ status: "draft", deadline: "2026-12-01T12:00:00+07:00" }, now), false)
})

test("a TOR with no deadline is a draft tender, not an open one", () => {
  assert.equal(isOpenForBids({ status: "open", deadline: "" }, now), false)
})

const tors = [
  { id: "a", announcementDate: "2026-10-02T09:00:00+07:00", budgetBaht: 5_000_000 },
  { id: "b", announcementDate: "2026-10-05T09:00:00+07:00", budgetBaht: 12_000_000 },
  { id: "c", announcementDate: "2026-10-03T09:00:00+07:00", budgetBaht: 800_000 },
  { id: "d", announcementDate: "", budgetBaht: 5_000_000 },
]
const ids = (sort: Parameters<typeof sortTors>[1]) => sortTors(tors, sort).map((tor) => tor.id)

test("newest projects first is the default", () => {
  assert.equal(DEFAULT_TOR_SORT, "opened-desc")
  assert.deepEqual(ids("opened-desc"), ["b", "c", "a", "d"])
})

test("oldest projects first", () => {
  assert.deepEqual(ids("opened-asc"), ["a", "c", "b", "d"])
})

test("highest and lowest budget first, equal budgets keep their incoming order", () => {
  assert.deepEqual(ids("budget-desc"), ["b", "a", "d", "c"])
  assert.deepEqual(ids("budget-asc"), ["c", "a", "d", "b"])
})

test("sorting does not change the input and only accepts known keys", () => {
  const before = tors.map((tor) => tor.id)
  sortTors(tors, "budget-asc")
  assert.deepEqual(tors.map((tor) => tor.id), before)
  assert.equal(isTorSort("budget-asc"), true)
  assert.equal(isTorSort("closes-asc"), false)
})
