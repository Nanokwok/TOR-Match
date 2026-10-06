import test from "node:test"
import assert from "node:assert/strict"
import * as z from "zod/v4"
import { extractionSchema } from "../src/scraper/extract"
import { CERTIFICATION_IDS } from "../src/domain/qualification-taxonomy"

test("the extraction schema renders as a JSON schema the model can be constrained to", () => {
  // This is what the Vertex call passes as responseJsonSchema. A schema the
  // renderer refuses would only surface as a failed extraction at runtime.
  const rendered = z.toJSONSchema(extractionSchema) as { type?: string; properties?: Record<string, unknown> }
  assert.equal(rendered.type, "object")
  for (const field of ["title", "summary", "qualificationRequirements", "milestones"]) {
    assert.ok(rendered.properties?.[field], `missing ${field}`)
  }
})

test("the certification ids the model may emit are the ones the app knows", () => {
  assert.deepEqual([...CERTIFICATION_IDS].sort(), ["cmmi-2", "iso-27001", "iso-29110", "iso-9001"])
})
