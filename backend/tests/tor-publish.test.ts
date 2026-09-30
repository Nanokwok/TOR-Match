import test from "node:test"
import assert from "node:assert/strict"
import { missingRequiredField } from "../src/services/tor-publish.service"
import type { TorDraftDoc } from "../src/models/TorDraft.model"

function draft(overrides: Partial<Record<"title" | "department", { en?: string; th?: string }>>) {
  return {
    title: { en: "Title", th: "ชื่อ", ...overrides.title },
    department: { en: "Dept", th: "แผนก", ...overrides.department },
  } as unknown as TorDraftDoc
}

test("missingRequiredField passes when title and department each have a value in some language", () => {
  assert.equal(missingRequiredField(draft({})), null)
  assert.equal(missingRequiredField(draft({ title: { en: "" } })), null)
  assert.equal(missingRequiredField(draft({ department: { en: "" } })), null)
})

test("missingRequiredField reports the first field blank in every language, in schema order", () => {
  assert.equal(missingRequiredField(draft({ title: { en: "", th: "" } })), "title")
  assert.equal(missingRequiredField(draft({ department: { en: "", th: "" } })), "department")
})

test("missingRequiredField treats whitespace-only text in every language as blank", () => {
  assert.equal(missingRequiredField(draft({ title: { en: "   ", th: "  " } })), "title")
})
