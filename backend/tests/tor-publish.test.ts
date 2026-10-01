import test from "node:test"
import assert from "node:assert/strict"
import { missingRequiredEnglishField } from "../src/services/tor-publish.service"
import type { TorDraftDoc } from "../src/models/TorDraft.model"

function draft(overrides: Partial<Record<"title" | "department" | "localOffice" | "summary", string>>) {
  const localized = (en: string) => ({ en, th: "ไทย" })
  return {
    title: localized(overrides.title ?? "Title"),
    department: localized(overrides.department ?? "Dept"),
    localOffice: localized(overrides.localOffice ?? "Office"),
    summary: localized(overrides.summary ?? "Summary"),
  } as unknown as TorDraftDoc
}

test("missingRequiredEnglishField passes when every required field has English text", () => {
  assert.equal(missingRequiredEnglishField(draft({})), null)
})

test("missingRequiredEnglishField reports the first blank field, in schema order", () => {
  assert.equal(missingRequiredEnglishField(draft({ title: "" })), "title")
  assert.equal(missingRequiredEnglishField(draft({ department: "" })), "department")
  assert.equal(missingRequiredEnglishField(draft({ localOffice: "" })), "localOffice")
  assert.equal(missingRequiredEnglishField(draft({ summary: "" })), "summary")
})

test("missingRequiredEnglishField treats whitespace-only English text as blank", () => {
  assert.equal(missingRequiredEnglishField(draft({ title: "   " })), "title")
})
