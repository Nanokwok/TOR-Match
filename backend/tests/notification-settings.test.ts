import test from "node:test"
import assert from "node:assert/strict"
import { NotificationSettings } from "../src/models/NotificationSettings.model"
import { emailRecipient, allowsEmail, allowsInApp } from "../src/services/match-notification.service"

test("emailRecipient falls back to account email when unset, blank or legacy placeholder", () => {
  assert.equal(emailRecipient(null, "user@test.com"), "user@test.com")
  assert.equal(emailRecipient({}, "user@test.com"), "user@test.com")
  assert.equal(emailRecipient({ emailRecipient: "" }, "user@test.com"), "user@test.com")
  assert.equal(emailRecipient({ emailRecipient: "   " }, "user@test.com"), "user@test.com")
  assert.equal(emailRecipient({ emailRecipient: "user@company.com" }, "user@test.com"), "user@test.com")
  assert.equal(emailRecipient({ emailRecipient: "custom@test.com" }, "user@test.com"), "custom@test.com")
})

test("allowsEmail and allowsInApp default to on except 7-day deadline email", () => {
  assert.equal(allowsInApp(null, "new-high-match"), true)
  assert.equal(allowsInApp(null, "high-budget"), true)
  assert.equal(allowsInApp(null, "deal-breaker"), true)
  assert.equal(allowsInApp(null, "deadline-7-day"), true)
  assert.equal(allowsInApp(null, "deadline-3-day"), true)
  assert.equal(allowsInApp(null, "deadline-24-hour"), true)

  assert.equal(allowsEmail(null, "new-high-match"), true)
  assert.equal(allowsEmail(null, "high-budget"), true)
  assert.equal(allowsEmail(null, "deal-breaker"), true)
  assert.equal(allowsEmail(null, "deadline-7-day"), false)
  assert.equal(allowsEmail(null, "deadline-3-day"), true)
  assert.equal(allowsEmail(null, "deadline-24-hour"), true)
})

test("allowsEmail and allowsInApp honor saved per-event preferences", () => {
  const custom = {
    events: {
      "new-high-match": { inApp: false, email: false },
      "deadline-7-day": { inApp: true, email: true },
    },
  }
  assert.equal(allowsInApp(custom, "new-high-match"), false)
  assert.equal(allowsEmail(custom, "new-high-match"), false)
  assert.equal(allowsInApp(custom, "deadline-7-day"), true)
  assert.equal(allowsEmail(custom, "deadline-7-day"), true)
})

test("NotificationSettings schema accepts valid digest times and days", () => {
  const doc = new NotificationSettings({
    userId: "507f1f77bcf86cd799439011",
    dailyDigestTime: "12:00",
    weeklyDigestDay: "wednesday",
    weeklyDigestTime: "17:00",
  })
  const err = doc.validateSync()
  assert.equal(err, undefined)
})

test("NotificationSettings schema rejects invalid digest times and days", () => {
  const invalidTimeDoc = new NotificationSettings({
    userId: "507f1f77bcf86cd799439011",
    dailyDigestTime: "07:00",
  })
  const timeErr = invalidTimeDoc.validateSync()
  assert.ok(timeErr?.errors["dailyDigestTime"])

  const invalidDayDoc = new NotificationSettings({
    userId: "507f1f77bcf86cd799439011",
    weeklyDigestDay: "sunday",
  })
  const dayErr = invalidDayDoc.validateSync()
  assert.ok(dayErr?.errors["weeklyDigestDay"])
})
