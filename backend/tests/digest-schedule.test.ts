import test from "node:test"
import assert from "node:assert/strict"
import { bangkokClock, digestDue, parseClockTime } from "../src/domain/digest-schedule"

// 2026-10-26 is a Monday. 01:00Z is 08:00 in Bangkok.
const at = (iso: string) => new Date(iso)

test("bangkokClock reads the date, time and weekday in Bangkok, across midnight", () => {
  assert.deepEqual(bangkokClock(at("2026-10-26T01:00:00Z")), { date: "2026-10-26", minutes: 480, weekday: "monday" })
  assert.deepEqual(bangkokClock(at("2026-10-26T18:30:00Z")), { date: "2026-10-27", minutes: 90, weekday: "tuesday" })
})

test("parseClockTime accepts HH:MM and rejects anything else", () => {
  assert.equal(parseClockTime("08:00"), 480)
  assert.equal(parseClockTime("20:30"), 1230)
  assert.equal(parseClockTime("24:00"), null)
  assert.equal(parseClockTime("8:00"), null)
  assert.equal(parseClockTime(undefined), null)
})

test("a daily digest is not due before its time, due after it, and not due once the grace period passes", () => {
  const params = { kind: "daily" as const, time: "08:00" }
  assert.equal(digestDue({ ...params, now: at("2026-10-26T00:59:00Z") }).due, false)
  assert.equal(digestDue({ ...params, now: at("2026-10-26T01:00:00Z") }).due, true)
  assert.equal(digestDue({ ...params, now: at("2026-10-26T05:59:00Z") }).due, true)
  assert.equal(digestDue({ ...params, now: at("2026-10-26T07:00:00Z") }).due, false)
})

test("every tick of one day shares one period key, and the next day has another", () => {
  const params = { kind: "daily" as const, time: "08:00" }
  assert.equal(
    digestDue({ ...params, now: at("2026-10-26T01:00:00Z") }).periodKey,
    digestDue({ ...params, now: at("2026-10-26T03:00:00Z") }).periodKey
  )
  assert.notEqual(
    digestDue({ ...params, now: at("2026-10-26T01:00:00Z") }).periodKey,
    digestDue({ ...params, now: at("2026-10-27T01:00:00Z") }).periodKey
  )
})

test("a weekly digest is only due on its weekday", () => {
  const params = { kind: "weekly" as const, time: "09:00", weekday: "monday" }
  assert.equal(digestDue({ ...params, now: at("2026-10-26T02:00:00Z") }).due, true)
  assert.equal(digestDue({ ...params, now: at("2026-10-27T02:00:00Z") }).due, false)
})

test("a time that is not valid never comes due", () => {
  assert.equal(digestDue({ kind: "daily", time: "soon", now: at("2026-10-26T02:00:00Z") }).due, false)
})
