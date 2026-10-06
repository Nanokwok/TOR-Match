import test from "node:test"
import assert from "node:assert/strict"
import { selectNewMatches } from "../src/services/match-notification.service"

test("selectNewMatches only returns eligible TORs the user was not already notified about", () => {
  assert.deepEqual(selectNewMatches(["a", "b", "c"], ["b"]), ["a", "c"])
})

test("selectNewMatches returns nothing when every eligible TOR was already notified", () => {
  assert.deepEqual(selectNewMatches(["a", "b"], ["a", "b", "z"]), [])
})

test("selectNewMatches returns everything when nothing was notified yet", () => {
  assert.deepEqual(selectNewMatches(["a", "b"], []), ["a", "b"])
})

test("selectNewMatches is a no-op on an empty eligible list", () => {
  assert.deepEqual(selectNewMatches([], ["a"]), [])
})

import {
  allowsInApp,
  becameDealBreaker,
  isHighBudget,
  HIGH_BUDGET_THRESHOLD_BAHT,
  requirementsVersion,
} from "../src/services/match-notification.service"

const capitalRule = (amountThb: number) => ({
  id: "req-capital",
  key: "registered-capital",
  requirement: { en: "Registered capital", th: "ทุนจดทะเบียน" },
  torCriteria: { en: `at least ${amountThb}`, th: `ไม่ต่ำกว่า ${amountThb}` },
  autoCheckable: true,
  criteria: { type: "registered-capital", op: ">=", amountThb },
})

const company = { registeredCapitalThb: "5,000,000" }

test("allowsInApp defaults to on when the user never saved settings", () => {
  assert.equal(allowsInApp(null, "high-budget"), true)
})

test("allowsInApp respects the master in-app switch and the per-event switch", () => {
  assert.equal(allowsInApp({ inAppEnabled: false }, "deal-breaker"), false)
  assert.equal(allowsInApp({ events: { "high-budget": { inApp: false } } }, "high-budget"), false)
  assert.equal(allowsInApp({ events: { "high-budget": { inApp: false } } }, "deal-breaker"), true)
  assert.equal(allowsInApp({ inAppEnabled: true, events: { "new-high-match": { inApp: true } } }, "new-high-match"), true)
})

test("isHighBudget is strictly above the threshold", () => {
  assert.equal(isHighBudget({ budgetBaht: HIGH_BUDGET_THRESHOLD_BAHT }), false)
  assert.equal(isHighBudget({ budgetBaht: HIGH_BUDGET_THRESHOLD_BAHT + 1 }), true)
})

test("becameDealBreaker fires when a raised threshold makes the company fail", () => {
  assert.equal(becameDealBreaker(company, [capitalRule(2_000_000)], [capitalRule(8_000_000)]), true)
})

test("becameDealBreaker stays quiet when the company still passes, already failed, or there is no prior version", () => {
  assert.equal(becameDealBreaker(company, [capitalRule(2_000_000)], [capitalRule(3_000_000)]), false)
  assert.equal(becameDealBreaker(company, [capitalRule(9_000_000)], [capitalRule(8_000_000)]), false)
  assert.equal(becameDealBreaker(company, null, [capitalRule(8_000_000)]), false)
})

test("requirementsVersion is stable for the same rules and changes when a rule changes", () => {
  assert.equal(requirementsVersion([capitalRule(2_000_000)]), requirementsVersion([capitalRule(2_000_000)]))
  assert.notEqual(requirementsVersion([capitalRule(2_000_000)]), requirementsVersion([capitalRule(8_000_000)]))
})
