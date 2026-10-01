import test from "node:test"
import assert from "node:assert/strict"
import { publishBlocker } from "../src/services/tor-publish.service"
import type { TorDraftDoc } from "../src/models/TorDraft.model"

function draft(overrides: Partial<Record<"title" | "department", { en?: string; th?: string }>>) {
  return {
    title: { en: "Title", th: "ชื่อ", ...overrides.title },
    department: { en: "Dept", th: "แผนก", ...overrides.department },
  } as unknown as TorDraftDoc
}

test("publishBlocker passes when title and department each have a value in some language", () => {
  assert.equal(publishBlocker(draft({})), null)
  assert.equal(publishBlocker(draft({ title: { en: "" } })), null)
  assert.equal(publishBlocker(draft({ department: { en: "" } })), null)
})

test("publishBlocker reports the first field blank in every language, in schema order", () => {
  assert.equal(publishBlocker(draft({ title: { en: "", th: "" } })), "title is empty")
  assert.equal(publishBlocker(draft({ department: { en: "", th: "" } })), "department is empty")
})

test("publishBlocker treats whitespace-only text in every language as blank", () => {
  assert.equal(publishBlocker(draft({ title: { en: "   ", th: "  " } })), "title is empty")
})
