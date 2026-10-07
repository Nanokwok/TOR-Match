import test from "node:test"
import assert from "node:assert/strict"
import { parseDeadline, reminderWindowFor } from "../src/services/deadline-reminder.service"
import { allowsEmail, allowsInApp } from "../src/services/match-notification.service"

test("reminderWindowFor picks only the tightest window", () => {
  assert.equal(reminderWindowFor(200), null)
  assert.equal(reminderWindowFor(168), "deadline-7-day")
  assert.equal(reminderWindowFor(100), "deadline-7-day")
  assert.equal(reminderWindowFor(72), "deadline-3-day")
  assert.equal(reminderWindowFor(30), "deadline-3-day")
  assert.equal(reminderWindowFor(24), "deadline-24-hour")
  assert.equal(reminderWindowFor(0.5), "deadline-24-hour")
})

test("reminderWindowFor ignores deadlines that already passed or are not a number", () => {
  assert.equal(reminderWindowFor(0), null)
  assert.equal(reminderWindowFor(-3), null)
  assert.equal(reminderWindowFor(Number.NaN), null)
})

test("parseDeadline reads an offset-less time as Bangkok time, not the server's zone", () => {
  assert.equal(parseDeadline("2026-10-01T12:30")?.toISOString(), "2026-10-01T05:30:00.000Z")
  assert.equal(parseDeadline("2026-10-01T12:30:00")?.toISOString(), "2026-10-01T05:30:00.000Z")
})

test("parseDeadline keeps an explicit offset and closes a bare date at end of day", () => {
  assert.equal(parseDeadline("2026-10-01T12:30:00Z")?.toISOString(), "2026-10-01T12:30:00.000Z")
  assert.equal(parseDeadline("2026-10-01")?.toISOString(), "2026-10-01T16:59:00.000Z")
})

test("parseDeadline returns null for blank or unreadable values", () => {
  assert.equal(parseDeadline(""), null)
  assert.equal(parseDeadline("   "), null)
  assert.equal(parseDeadline(undefined), null)
  assert.equal(parseDeadline("soon"), null)
})

test("the 7-day reminder email is off by default; 3-day and 24-hour are on", () => {
  assert.equal(allowsEmail(null, "deadline-7-day"), false)
  assert.equal(allowsEmail(null, "deadline-3-day"), true)
  assert.equal(allowsEmail(null, "deadline-24-hour"), true)
  assert.equal(allowsEmail({}, "deadline-7-day"), false)
})

test("a saved preference overrides the reminder defaults", () => {
  assert.equal(allowsEmail({ events: { "deadline-7-day": { email: true } } }, "deadline-7-day"), true)
  assert.equal(allowsEmail({ events: { "deadline-3-day": { email: false } } }, "deadline-3-day"), false)
  assert.equal(allowsEmail({ emailEnabled: false }, "deadline-24-hour"), false)
  assert.equal(allowsInApp({ events: { "deadline-24-hour": { inApp: false } } }, "deadline-24-hour"), false)
  assert.equal(allowsInApp(null, "deadline-7-day"), true)
})
