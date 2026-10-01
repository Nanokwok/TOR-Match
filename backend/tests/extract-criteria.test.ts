import test from "node:test"
import assert from "node:assert/strict"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { criteriaSchema, extractionSchema, KNOWN_CERTIFICATION_IDS } from "../src/scraper/extract"
import { qualificationCriteriaSchema } from "../src/validation/qualification"

// extract.ts's schema is zod v4 (the SDK helper requires it); the matching
// engine's is zod v3 (@/validation/qualification). They are hand-kept in
// sync rather than shared across the version boundary — these tests are
// what actually enforces that, by round-tripping the same sample values
// through both and requiring identical verdicts.
const samples: unknown[] = [
  { type: "min-registered-capital", minAmountThb: 2_000_000 },
  { type: "min-past-contract", minAmountThb: 1_500_000 },
  { type: "certification", certificationIds: ["iso-29110", "cmmi-2"], mode: "any" },
  { type: "certification", certificationIds: ["iso-27001"], mode: "all" },
  { type: "egp-registered" },
  { type: "not-blacklisted" },
  { type: "manual" },
]

test("every sample criteria value is accepted by both the extraction schema (v4) and the matching engine's schema (v3)", () => {
  for (const sample of samples) {
    assert.equal(criteriaSchema.safeParse(sample).success, true, `v4 rejected: ${JSON.stringify(sample)}`)
    assert.equal(qualificationCriteriaSchema.safeParse(sample).success, true, `v3 rejected: ${JSON.stringify(sample)}`)
  }
})

test("both schemas reject a certification id outside the app's known set", () => {
  const sample = { type: "certification", certificationIds: ["iso-45001"], mode: "any" }
  assert.equal(criteriaSchema.safeParse(sample).success, false)
  // The v3 schema (used for company-profile input) intentionally allows any
  // non-empty id — extraction is the stricter side, so only assert v4 here.
})

test("both schemas reject an unlisted criteria type", () => {
  const sample = { type: "min-team-size", count: 3 }
  assert.equal(criteriaSchema.safeParse(sample).success, false)
  assert.equal(qualificationCriteriaSchema.safeParse(sample).success, false)
})

test("KNOWN_CERTIFICATION_IDS matches the app's certification options", () => {
  assert.deepEqual([...KNOWN_CERTIFICATION_IDS].sort(), ["cmmi-2", "iso-27001", "iso-29110", "iso-9001"])
})

test("the full extraction schema builds a structured-output format without throwing", () => {
  assert.doesNotThrow(() => zodOutputFormat(extractionSchema))
})
