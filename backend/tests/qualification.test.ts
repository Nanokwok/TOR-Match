import test from "node:test"
import assert from "node:assert/strict"
import { matchCompanyToTor } from "../src/services/qualification.service"
import { qualificationCriteriaSchema } from "../src/validation/qualification"
import { Tor } from "../src/models/Tor.model"
import seeds from "../src/seed/tors.seed.json"

const now = new Date("2026-09-09T12:00:00Z")
const text = { en: "Requirement", th: "ข้อกำหนด" }
function requirement(criteria: unknown, autoCheckable = true) {
  return { id: "test", requirement: text, torCriteria: text, autoCheckable, criteria }
}
const capital = { type: "min-registered-capital", minAmountThb: 5_000_000 }
const certificate = { type: "certification", certificationIds: ["iso-29110", "cmmi-2"], mode: "any" }
function check(company: Parameters<typeof matchCompanyToTor>[0], criteria: unknown, time = now) {
  return matchCompanyToTor(company, { qualificationRequirements: [requirement(criteria)] }, time)
}
function cert(id = "iso-29110", expirationDate = "2026-09-09") {
  return { id, selected: true, certificateNumber: "CERT-123", expirationDate }
}

test("capital meets the exact threshold; below it fails; blank/invalid values are unknown", () => {
  assert.equal(check({ registeredCapitalThb: "5,000,000" }, capital).eligible, true)
  assert.equal(check({ registeredCapitalThb: "4999999.99" }, capital).status, "failed")
  for (const value of ["", "oops", "-1", "Infinity", "0x100", "1e9"]) {
    assert.equal(check({ registeredCapitalThb: value }, capital).status, "insufficient-data")
  }
})

test("no profile, no requirements, and legacy/invalid criteria cannot pass", () => {
  assert.equal(check(null, capital).profileSetup, false)
  assert.equal(check(null, capital).eligible, false)
  for (const criteria of [undefined, { type: "unknown" }, { type: "min-registered-capital" }]) {
    assert.equal(check({ registeredCapitalThb: "999999999" }, criteria).status, "insufficient-data")
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
  assert.equal(check({}, { type: "manual" }).eligible, false)
})

test("past performance uses an individual contract, not the sum; partial records stay unknown", () => {
  const criteria = { type: "min-past-contract", minAmountThb: 100 }
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

test("certification expires precisely at next midnight in Bangkok", () => {
  const company = { certifications: [cert()] }
  assert.equal(check(company, certificate, new Date("2026-09-09T16:59:59.999Z")).eligible, true)
  assert.equal(check(company, certificate, new Date("2026-09-09T17:00:00.000Z")).eligible, false)
})

test("each TOR supplies its own thresholds and certificate IDs; no hardcoded default matching", () => {
  const company = { registeredCapitalThb: "5000000", certifications: [cert("iso-9001")] }
  assert.equal(check(company, capital).eligible, true)
  assert.equal(check(company, { ...capital, minAmountThb: 6000000 }).eligible, false)
  assert.equal(check(company, certificate).eligible, false)
  assert.equal(check(company, { ...certificate, certificationIds: ["iso-9001"] }).eligible, true)
})

test("e-GP and blacklist declarations evaluate actual company fields", () => {
  assert.equal(check({ egpStatus: "registered" }, { type: "egp-registered" }).eligible, true)
  assert.equal(check({ egpStatus: "in-progress" }, { type: "egp-registered" }).status, "failed")
  assert.equal(check({}, { type: "egp-registered" }).status, "insufficient-data")
  assert.equal(check({ notBlacklisted: false }, { type: "not-blacklisted" }).status, "failed")
})

test("criteria reject missing fields, invalid amounts, empty certificate sets and incompatible fields", () => {
  for (const value of [{ type: "certification", certificationIds: [], mode: "any" }, { ...capital, minAmountThb: -1 }, { ...capital, certificationIds: ["x"] }]) {
    assert.equal(qualificationCriteriaSchema.safeParse(value).success, false)
    assert.ok(new Tor({ qualificationRequirements: [requirement(value)] }).validateSync()?.errors["qualificationRequirements.0.criteria"])
  }
})

test("every backend fixture validates and has structured criteria plus separate work-scope review", async () => {
  assert.equal(seeds.length, 15)
  for (const seed of seeds) {
    await new Tor(seed).validate()
    for (const row of seed.qualificationRequirements) assert.equal(qualificationCriteriaSchema.safeParse(row.criteria).success, true)
    assert.ok(seed.qualificationRequirements.some((row) => row.id === "manual-contract-scope" && row.criteria.type === "manual"))
  }
})
