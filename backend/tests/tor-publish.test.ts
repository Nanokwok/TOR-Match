import test from "node:test"
import assert from "node:assert/strict"
import { publishBlocker } from "../src/services/tor-publish.service"
import type { TorDraftDoc } from "../src/models/TorDraft.model"

type Localized = { en: string; th: string }

function draft(overrides: Partial<Record<"title" | "department", Partial<Localized>>> = {}) {
  const localized = (value: Partial<Localized> | undefined, fallback: string): Localized => ({
    en: value?.en ?? fallback,
    th: value?.th ?? "ไทย",
  })
  return {
    title: localized(overrides.title, "Title"),
    department: localized(overrides.department, "Dept"),
  } as unknown as TorDraftDoc
}

test("a draft with a title and a department can be published", () => {
  assert.equal(publishBlocker(draft()), null)
})

test("either locale satisfies the requirement", () => {
  // The announcements this ingests are Thai, and English is filled in by the
  // model when it can be. Requiring English would make every ingested TOR
  // unpublishable.
  assert.equal(publishBlocker(draft({ title: { en: "" }, department: { en: "" } })), null)
})

test("a field blank in both locales blocks publishing, and is named", () => {
  assert.equal(publishBlocker(draft({ title: { en: "", th: "" } })), "title is empty")
  assert.equal(publishBlocker(draft({ department: { en: "", th: "" } })), "department is empty")
})

test("whitespace is not a value", () => {
  assert.equal(publishBlocker(draft({ title: { en: "   ", th: "  " } })), "title is empty")
})
