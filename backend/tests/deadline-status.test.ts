import test from "node:test"
import assert from "node:assert/strict"
import { CLOSING_SOON_DAYS, statusForDeadline } from "../src/services/deadline-status.service"

/**
 * Ageing a TOR's status as its deadline passes.
 *
 * Status otherwise follows the announcement type, which never says "the
 * submission window ran out" — no agency publishes that. Day-walking made it
 * matter: invitations a month old now reach /browse, and without this they
 * advertise work nobody can bid for.
 */

const NOW = new Date("2026-10-07T12:00:00+07:00")

/** `days` from NOW, as the extraction stores deadlines. */
function deadlineIn(days: number): string {
  return new Date(NOW.getTime() + days * 86_400_000).toISOString()
}

test("a deadline in the past closes the TOR", () => {
  assert.equal(statusForDeadline(deadlineIn(-1), "open", NOW), "closed")
  assert.equal(statusForDeadline(deadlineIn(-30), "open", NOW), "closed")
})

test("a deadline inside the warning window is closing soon", () => {
  assert.equal(statusForDeadline(deadlineIn(1), "open", NOW), "closing-soon")
  assert.equal(statusForDeadline(deadlineIn(CLOSING_SOON_DAYS - 0.5), "open", NOW), "closing-soon")
})

test("a deadline further out leaves the TOR open", () => {
  assert.equal(statusForDeadline(deadlineIn(CLOSING_SOON_DAYS + 1), "open", NOW), null)
  assert.equal(statusForDeadline(deadlineIn(60), "open", NOW), null)
})

test("a status already correct is not rewritten, so a repeated run is silent", () => {
  assert.equal(statusForDeadline(deadlineIn(-1), "closed", NOW), null)
  assert.equal(statusForDeadline(deadlineIn(2), "closing-soon", NOW), null)
})

test("closing-soon still ages to closed once the deadline passes", () => {
  assert.equal(statusForDeadline(deadlineIn(-0.1), "closing-soon", NOW), "closed")
})

test("an outcome the agency published is never overruled by a date", () => {
  // A cancelled project is cancelled whatever its deadline said, and an awarded
  // one must not be relabelled "closed" — the award is the more useful fact.
  for (const status of ["cancelled", "awarded", "winner-cancelled", "winner-revised"]) {
    assert.equal(statusForDeadline(deadlineIn(-10), status, NOW), null, status)
  }
})

test("an amended invitation ages like any other — D2 leaves the bidding open", () => {
  assert.equal(statusForDeadline(deadlineIn(-1), "changed", NOW), "closed")
  assert.equal(statusForDeadline(deadlineIn(3), "changed", NOW), "closing-soon")
})

test("a TOR with no usable deadline is left alone rather than guessed at", () => {
  // A draft tender states no closing date; closing it on that basis would be
  // inventing a fact. It waits for its invitation.
  assert.equal(statusForDeadline("", "open", NOW), null)
  assert.equal(statusForDeadline(undefined, "open", NOW), null)
  assert.equal(statusForDeadline("-", "open", NOW), null)
  assert.equal(statusForDeadline("not a date", "open", NOW), null)
  assert.equal(statusForDeadline(deadlineIn(-1), undefined, NOW), null)
})

test("a bare date closes at the end of that day in Bangkok, not at midnight UTC", () => {
  // "2026-10-07" means bidding closes at the end of the 7th Thai time. Read as
  // UTC midnight it would close 07:00 ICT, shutting a TOR a working day early.
  const morning = new Date("2026-10-07T09:00:00+07:00")
  assert.equal(statusForDeadline("2026-10-07", "open", morning), "closing-soon")

  const afterwards = new Date("2026-10-08T09:00:00+07:00")
  assert.equal(statusForDeadline("2026-10-07", "open", afterwards), "closed")
})

test("an offsetless wall-clock deadline is read as Bangkok time", () => {
  // The admin review form stores local text with no offset.
  const before = new Date("2026-10-07T10:00:00+07:00")
  assert.equal(statusForDeadline("2026-10-07T12:00:00", "open", before), "closing-soon")

  const after = new Date("2026-10-07T13:00:00+07:00")
  assert.equal(statusForDeadline("2026-10-07T12:00:00", "open", after), "closed")
})
