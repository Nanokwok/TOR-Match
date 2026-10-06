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

import { allowsEmail, emailRecipient, renderEmail } from "../src/services/match-notification.service"

test("allowsEmail needs a saved preference — no settings means no email", () => {
  assert.equal(allowsEmail(null, "high-budget"), false)
  assert.equal(allowsEmail({}, "high-budget"), true)
})

test("allowsEmail honours the master, instant and per-event email switches", () => {
  assert.equal(allowsEmail({ emailEnabled: false }, "deal-breaker"), false)
  assert.equal(allowsEmail({ instantEmailAlerts: false }, "deal-breaker"), false)
  assert.equal(allowsEmail({ events: { "deal-breaker": { email: false } } }, "deal-breaker"), false)
  assert.equal(allowsEmail({ events: { "deal-breaker": { email: false } } }, "high-budget"), true)
})

test("emailRecipient prefers the saved alert address and falls back to the account email", () => {
  assert.equal(emailRecipient({ emailRecipient: " alerts@x.co " }, "me@x.co"), "alerts@x.co")
  assert.equal(emailRecipient({ emailRecipient: "" }, "me@x.co"), "me@x.co")
  assert.equal(emailRecipient(null, undefined), "")
  assert.equal(emailRecipient({ emailRecipient: "user@company.com" }, "me@x.co"), "me@x.co")
})

test("renderEmail is bilingual, links into the app and escapes scraped text", () => {
  const mail = renderEmail(
    {
      title: { en: "Big <b>TOR</b>", th: "งานใหญ่" },
      description: { en: "Budget & more", th: "งบสูง" },
      link: "/browse?tor=abc",
    },
    "http://localhost:3000/"
  )
  assert.equal(mail.subject, "งานใหญ่ / Big <b>TOR</b>")
  assert.ok(mail.text.includes("http://localhost:3000/browse?tor=abc"))
  assert.ok(mail.html.includes("Big &lt;b&gt;TOR&lt;/b&gt;"))
  assert.ok(!mail.html.includes("<b>TOR</b>"))
})

import { resolveSender } from "../src/services/email.service"

test("resolveSender uses the admin's support email as From and Reply-To", () => {
  assert.deepEqual(resolveSender(" Help@X.co ", "TOR Match <env@x.co>"), {
    from: "TOR Match <Help@X.co>",
    replyTo: "Help@X.co",
  })
})

test("resolveSender falls back to MAIL_FROM when unset, blank or the old placeholder", () => {
  const fallback = "TOR Match <env@x.co>"
  assert.deepEqual(resolveSender(undefined, fallback), { from: fallback })
  assert.deepEqual(resolveSender("  ", fallback), { from: fallback })
  assert.deepEqual(resolveSender("support@tormatch.local", fallback), { from: fallback })
})
