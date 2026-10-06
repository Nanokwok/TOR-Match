import test from "node:test"
import assert from "node:assert/strict"
import { matchCompanyToTor, type SelfCheckEntry } from "../src/services/qualification.service"
import { qualificationCriteriaSchema } from "../src/validation/qualification"
import { criteriaFingerprint } from "../src/domain/qualification-taxonomy"
import { Tor } from "../src/models/Tor.model"
import seeds from "../src/seed/tors.seed.json"

const now = new Date("2026-09-09T12:00:00Z")
const text = { en: "Requirement", th: "ข้อกำหนด" }
function requirement(criteria: unknown, autoCheckable = true) {
  return { id: "test", requirement: text, torCriteria: text, autoCheckable, criteria }
}
const capital = { type: "registered-capital", op: ">=", amountThb: 5_000_000 }
const certificate = { type: "certification", mode: "any", ids: ["iso-29110", "cmmi-2"] }
const egp = { type: "egp-registered", requiredStatus: "registered" }
function check(
  company: Parameters<typeof matchCompanyToTor>[0],
  criteria: unknown,
  time = now,
  selfCheck: SelfCheckEntry[] = [],
) {
  return matchCompanyToTor(company, { qualificationRequirements: [requirement(criteria)] }, time, selfCheck)
}
function cert(id = "iso-29110", expirationDate = "2026-09-09") {
  return { id, selected: true, certificateNumber: "CERT-123", expirationDate }
}
/** What the bidder ticked, against the version of the rule they were shown. */
function answer(criteria: unknown, value: boolean, requirementId = "test"): SelfCheckEntry {
  const type = (criteria as { type: string }).type
  return {
    requirementId,
    answer: value,
    criteriaFingerprint: criteriaFingerprint(type as never, criteria, text.th),
  }
}

test("capital meets the exact threshold; below it fails; blank/invalid values are unknown", () => {
  assert.equal(check({ registeredCapitalThb: "5,000,000" }, capital).eligible, true)
  assert.equal(check({ registeredCapitalThb: "4999999.99" }, capital).status, "failed")
  for (const value of ["", "oops", "-1", "Infinity", "0x100", "1e9"]) {
    assert.equal(check({ registeredCapitalThb: value }, capital).status, "insufficient-data")
  }
})

test("every comparison the admin editor offers is honoured", () => {
  // The editor has always shown five operators while the matcher only ever
  // meant ">=", so a reviewer picking "<=" configured a rule nothing ran.
  const company = { registeredCapitalThb: "5000000" }
  const at = (op: string, amountThb: number) => check(company, { type: "registered-capital", op, amountThb }).status
  assert.equal(at("=", 5_000_000), "passed")
  assert.equal(at("=", 5_000_001), "failed")
  assert.equal(at(">", 5_000_000), "failed")
  assert.equal(at(">=", 5_000_000), "passed")
  assert.equal(at("<", 6_000_000), "passed")
  assert.equal(at("<=", 5_000_000), "passed")
})

test("no profile, no requirements, and unconfigured criteria cannot pass", () => {
  assert.equal(check(null, capital).profileSetup, false)
  assert.equal(check(null, capital).eligible, false)
  for (const criteria of [undefined, { type: "unknown" }, { type: "registered-capital" }]) {
    // An unconfigured rule is a requirement we cannot check — which is what
    // "manual" means — so it goes to the bidder rather than reading as an error.
    const result = check({ registeredCapitalThb: "999999999" }, criteria)
    assert.equal(result.status, "manual-review")
    assert.equal(result.rows[0].selfCheckable, true)
    assert.equal(check({}, criteria).eligible, false)
  }
  const empty = matchCompanyToTor({}, { qualificationRequirements: [] }, now)
  assert.equal(empty.eligible, false)
  assert.equal(empty.status, "insufficient-data")
})

test("manual review remains pending even after automated criteria pass", () => {
  const result = matchCompanyToTor({ registeredCapitalThb: "5000000" }, {
    qualificationRequirements: [requirement(capital), requirement({ type: "manual" }, false)],
  }, now)
  assert.equal(result.eligible, true)
  assert.equal(result.status, "manual-review")
  assert.equal(result.requiresManualReview, true)
  assert.equal(result.rows[1].passed, null)
  assert.equal(result.readyToBid, false)
  assert.equal(check({}, { type: "manual" }).eligible, false)
})

test("past performance uses an individual contract, not the sum; partial records stay unknown", () => {
  const criteria = { type: "past-contract", op: ">=", amountThb: 100 }
  assert.equal(check({ pastProjects: [{ title: "A", contractValueThb: "50" }, { title: "B", contractValueThb: "50" }] }, criteria).status, "failed")
  assert.equal(check({ pastProjects: [{ title: "A", contractValueThb: "100" }] }, criteria).eligible, true)
  assert.equal(check({ pastProjects: [] }, criteria).status, "insufficient-data")
  assert.equal(check({ pastProjects: [{ title: "A", contractValueThb: "50" }, { title: "B", contractValueThb: "" }] }, criteria).status, "insufficient-data")
})

test("certificates support any/all and require selected, numbered, valid evidence", () => {
  const company = { certifications: [cert()] }
  assert.equal(check(company, certificate).eligible, true)
  assert.equal(check(company, { ...certificate, mode: "all" }).status, "failed")
  assert.equal(check({ certifications: [cert(), cert("cmmi-2")] }, { ...certificate, mode: "all" }).eligible, true)
  assert.equal(check({ certifications: [cert("iso-9001")] }, certificate).status, "failed")
  assert.equal(check({ certifications: [{ ...cert(), selected: false }] }, certificate).status, "failed")
  assert.equal(check({ certifications: [{ ...cert(), certificateNumber: " " }] }, certificate).status, "insufficient-data")
  assert.equal(check({ certifications: [cert("iso-29110", "2026-02-30")] }, certificate).status, "insufficient-data")
  assert.equal(check({ certifications: [cert("iso-29110", "2026-09-08")] }, certificate).status, "failed")
})

test("a standard the profile cannot hold is asked about, never failed", () => {
  // Matching is by exact id, so a custom standard could only ever produce
  // "failed" — which would accuse a bidder of lacking something we never asked.
  const criteria = { ...certificate, mode: "all", customIds: ["ISO 14001"] }
  const result = check({ certifications: [cert(), cert("cmmi-2")] }, criteria)
  assert.equal(result.status, "insufficient-data")
  assert.equal(result.rows[0].selfCheckable, true)
})

test("certification expires precisely at next midnight in Bangkok", () => {
  const company = { certifications: [cert()] }
  assert.equal(check(company, certificate, new Date("2026-09-09T16:59:59.999Z")).eligible, true)
  assert.equal(check(company, certificate, new Date("2026-09-09T17:00:00.000Z")).eligible, false)
})

test("each TOR supplies its own thresholds and certificate IDs; no hardcoded default matching", () => {
  const company = { registeredCapitalThb: "5000000", certifications: [cert("iso-9001")] }
  assert.equal(check(company, capital).eligible, true)
  assert.equal(check(company, { ...capital, amountThb: 6000000 }).eligible, false)
  assert.equal(check(company, certificate).eligible, false)
  assert.equal(check(company, { ...certificate, ids: ["iso-9001"] }).eligible, true)
})

test("e-GP and blacklist declarations evaluate actual company fields", () => {
  assert.equal(check({ egpStatus: "registered" }, egp).eligible, true)
  assert.equal(check({ egpStatus: "in-progress" }, egp).status, "failed")
  assert.equal(check({ egpStatus: "in-progress" }, { ...egp, requiredStatus: "in-progress" }).eligible, true)
  assert.equal(check({}, egp).status, "insufficient-data")
  assert.equal(check({ notBlacklisted: false }, { type: "not-blacklisted" }).status, "failed")
})

test("company size and specialization evaluate the fields the admin editor points at", () => {
  // Both rule types existed in the review screen with no matcher arm behind
  // them, so configuring one produced a row that could never resolve.
  const size = { type: "company-size", op: ">=", size: "medium" }
  assert.equal(check({ companySize: "large" }, size).eligible, true)
  assert.equal(check({ companySize: "small" }, size).status, "failed")
  assert.equal(check({ companySize: "large" }, { ...size, op: "=" }).status, "failed")
  assert.equal(check({}, size).status, "insufficient-data")

  const spec = { type: "specialization", mode: "all", ids: ["software-development", "data-ai"] }
  assert.equal(check({ specializations: ["software-development", "data-ai"] }, spec).eligible, true)
  assert.equal(check({ specializations: ["software-development"] }, spec).status, "failed")
  assert.equal(check({ specializations: ["software-development"] }, { ...spec, mode: "any" }).eligible, true)
  assert.equal(check({ specializations: [] }, spec).status, "insufficient-data")
})

test("a requirement the profile cannot answer is handed to the bidder, with the field to fill", () => {
  const result = check({ registeredCapitalThb: "" }, capital)
  const row = result.rows[0]
  assert.equal(row.selfCheckable, true)
  assert.equal(row.profileField?.name, "registeredCapitalThb")
  assert.equal(row.profileField?.filled, false)
  assert.equal(row.profileField?.wizardStep, "financial")
  assert.equal(result.missingProfileFields, 1)
  // A profile that does answer it reports the field as filled.
  assert.equal(check({ registeredCapitalThb: "5000000" }, capital).rows[0].profileField?.filled, true)
})

test("a bidder's own confirmation resolves the row without making them eligible", () => {
  // `eligible` sends the "you now qualify" notification and filters browse, so
  // a checkbox must never reach it.
  const manual = { type: "manual" }
  const confirmed = check({ registeredCapitalThb: "5000000" }, manual, now, [answer(manual, true)])
  assert.equal(confirmed.rows[0].status, "passed")
  assert.equal(confirmed.rows[0].selfCheckAnswer, true)
  assert.equal(confirmed.readyToBid, true)
  assert.equal(confirmed.eligible, false)

  const denied = check({ registeredCapitalThb: "5000000" }, manual, now, [answer(manual, false)])
  assert.equal(denied.rows[0].status, "failed")
  assert.equal(denied.readyToBid, false)
})

test("an answer given against a different version of the requirement is not honoured", () => {
  // The threshold could have doubled since they ticked; honouring the old tick
  // would report a compliance they never claimed.
  const stale: SelfCheckEntry = { requirementId: "test", answer: true, criteriaFingerprint: "not-the-current-one" }
  const result = check({ registeredCapitalThb: "5000000" }, { type: "manual" }, now, [stale])
  assert.equal(result.rows[0].status, "manual-review")
  assert.equal(result.rows[0].selfCheckStale, true)
  assert.equal(result.rows[0].selfCheckAnswer, null)
  assert.equal(result.readyToBid, false)
})

test("answers for requirements this TOR does not have are ignored", () => {
  const manual = { type: "manual" }
  const result = check({}, manual, now, [answer(manual, true, "some-other-row")])
  assert.equal(result.rows[0].status, "manual-review")
  assert.equal(result.rows[0].selfCheckAnswer, null)
})

test("nothing is self-checkable before a company profile exists", () => {
  // There would be no company to attach the answer to, and the useful prompt
  // is "set up your profile", not "tick this box".
  const result = check(null, { type: "manual" })
  assert.equal(result.rows[0].selfCheckable, false)
  assert.equal(result.profileSetup, false)
})

test("criteria reject missing fields, invalid amounts, empty certificate sets and incompatible fields", () => {
  for (const value of [{ type: "certification", ids: [], mode: "any" }, { ...capital, amountThb: -1 }, { ...capital, ids: ["x"] }]) {
    assert.equal(qualificationCriteriaSchema.safeParse(value).success, false)
    assert.ok(new Tor({ qualificationRequirements: [requirement(value)] }).validateSync()?.errors["qualificationRequirements.0.criteria"])
  }
})

test("every backend fixture validates, is keyed, and mixes automated with manual rows", async () => {
  // Counting fixtures pinned a number that any fixture work trips over; what
  // actually matters is that each one exercises both paths.
  assert.ok(seeds.length >= 15)
  for (const seed of seeds) {
    await new Tor(seed).validate()
    for (const row of seed.qualificationRequirements) {
      assert.equal(qualificationCriteriaSchema.safeParse(row.criteria).success, true, row.id)
      assert.equal(row.key, row.criteria.type, `${row.id} key and criteria type disagree`)
    }
    assert.ok(seed.qualificationRequirements.some((row) => row.criteria.type !== "manual"))
    assert.ok(seed.qualificationRequirements.some((row) => row.criteria.type === "manual"))
  }
})
