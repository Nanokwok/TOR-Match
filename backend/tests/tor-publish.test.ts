import test from "node:test"
import assert from "node:assert/strict"
import { hasInvitation, publishBlocker } from "../src/services/tor-publish.service"
import type { TorDraftDoc } from "../src/models/TorDraft.model"

type Localized = { en: string; th: string }

/** A draft whose invitation has been published, unless told otherwise. */
function draft(
  overrides: Partial<Record<"title" | "department", Partial<Localized>>> = {},
  announceTypes: string[] = ["B0", "D0"]
) {
  const localized = (value: Partial<Localized> | undefined, fallback: string): Localized => ({
    en: value?.en ?? fallback,
    th: value?.th ?? "ไทย",
  })
  return {
    title: localized(overrides.title, "Title"),
    department: localized(overrides.department, "Dept"),
    announcements: announceTypes.map((announceType) => ({
      announceType,
      announceLabel: "",
      url: `https://example.test/${announceType}.pdf`,
      publishedDate: "2026-10-01",
      title: "",
    })),
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

test("a tender with no invitation yet waits rather than publishing", () => {
  // B0 ร่างเอกสารประกวดราคา states the qualifications but no closing date,
  // because bidding has not opened. Published, it would offer a bidder
  // something they cannot act on and a deadline reading "-".
  assert.equal(publishBlocker(draft({}, ["B0"])), "no invitation announcement yet (D0)")
  assert.equal(hasInvitation({ announcements: [] } as never), false)
})

test("an amended invitation counts as an invitation", () => {
  assert.equal(publishBlocker(draft({}, ["B0", "D2"])), null)
})
