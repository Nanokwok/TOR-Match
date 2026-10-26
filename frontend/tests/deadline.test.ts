import test from "node:test"
import assert from "node:assert/strict"

import { formatThaiShortDate, getDaysLeftUntil, getTorDeadlineInfo, getTorStage } from "../src/lib/deadline"

const now = new Date("2026-10-26T05:00:00Z")

test("a TOR with a deadline and an open status is open, whatever 'open' is spelled like", () => {
  assert.equal(getTorStage({ status: "open", deadline: "2026-11-01T12:00:00+07:00" }), "open")
  assert.equal(getTorStage({ status: "closing-soon", deadline: "2026-11-01T12:00:00+07:00" }), "open")
  assert.equal(getTorStage({ status: "changed", deadline: "2026-11-01" }), "open")
  assert.equal(getTorStage({ status: "OPEN", deadline: "2026-11-01" }), "open")
})

test("a TOR with no usable deadline is a draft: there is nothing to bid against yet", () => {
  assert.equal(getTorStage({ status: "open", deadline: "" }), "draft")
  assert.equal(getTorStage({ status: "open", deadline: null }), "draft")
  assert.equal(getTorStage({ status: "open", deadline: "-" }), "draft")
  assert.equal(getTorStage({ status: "open", deadline: "not a date" }), "draft")
  assert.equal(getTorStage({ status: "draft", deadline: "2026-11-01" }), "draft")
})

test("closed and awarded TORs are closed", () => {
  assert.equal(getTorStage({ status: "closed", deadline: "2026-11-01" }), "closed")
  assert.equal(getTorStage({ status: "awarded", deadline: "2026-11-01" }), "closed")
})

test("dates are shown in the Buddhist era for Thai and in the Gregorian calendar for English", () => {
  assert.equal(formatThaiShortDate("2026-10-15", "th"), "15 ต.ค. 69")
  assert.equal(formatThaiShortDate("2026-10-15", "en"), "15 Oct 26")
})

test("days left counts calendar days from today", () => {
  assert.equal(getDaysLeftUntil("2026-10-31T12:00:00+07:00", now), 5)
  assert.equal(getDaysLeftUntil("2026-10-26T12:00:00+07:00", now), 0)
})

test("an open TOR says how long is left, in both languages", () => {
  const tor = { status: "open", deadline: "2026-10-31T12:00:00+07:00" }
  const th = getTorDeadlineInfo(tor, "th", now)
  assert.equal(th.stage, "open")
  assert.equal(th.daysLeft, 5)
  assert.ok(th.fullDisplay.includes("เหลือ 5 วัน"))
  const en = getTorDeadlineInfo(tor, "en", now)
  assert.ok(en.fullDisplay.includes("5 days left"))
})

test("a closed TOR shows when it closed, with no countdown", () => {
  const info = getTorDeadlineInfo({ status: "closed", deadline: "2026-10-20T12:00:00+07:00" }, "en", now)
  assert.equal(info.stage, "closed")
  assert.equal(info.label, "Submission Closed")
  assert.equal(info.daysLeft, null)
})

test("a draft with no date asks to be bookmarked rather than showing a deadline", () => {
  const info = getTorDeadlineInfo({ status: "draft", deadline: "" }, "th", now)
  assert.equal(info.stage, "draft")
  assert.equal(info.isPendingNotice, true)
  assert.equal(info.daysLeft, null)
})
