import test from "node:test"
import assert from "node:assert/strict"
import { certificateExpiry } from "../src/domain/certificate-expiry"

const today = "2026-10-26"

test("a certificate is valid through its expiration date and expired from the next day", () => {
  assert.deepEqual(certificateExpiry("2026-10-26", today), { state: "expiring", daysLeft: 0 })
  assert.deepEqual(certificateExpiry("2026-10-25", today), { state: "expired", daysAgo: 1 })
})

test("it starts warning 30 days ahead and not before", () => {
  assert.deepEqual(certificateExpiry("2026-11-25", today), { state: "expiring", daysLeft: 30 })
  assert.deepEqual(certificateExpiry("2026-11-26", today), { state: "ok" })
})

test("a date that is missing or malformed gives nothing to warn about", () => {
  assert.deepEqual(certificateExpiry("", today), { state: "unknown" })
  assert.deepEqual(certificateExpiry(undefined, today), { state: "unknown" })
  assert.deepEqual(certificateExpiry("26/10/2026", today), { state: "unknown" })
  assert.deepEqual(certificateExpiry("2026-02-31x", today), { state: "unknown" })
})

test("it counts calendar days across month and year ends", () => {
  assert.deepEqual(certificateExpiry("2027-01-05", "2026-12-30"), { state: "expiring", daysLeft: 6 })
  assert.deepEqual(certificateExpiry("2026-12-31", "2027-01-02"), { state: "expired", daysAgo: 2 })
})
