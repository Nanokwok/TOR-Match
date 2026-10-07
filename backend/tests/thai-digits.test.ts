import test from "node:test"
import assert from "node:assert/strict"
import { hasThaiDigits, toArabicDigits, toArabicDigitsDeep } from "../src/utils/thai-digits"

test("Thai numerals become Arabic ones", () => {
  assert.equal(toArabicDigits("๐๑๒๓๔๕๖๗๘๙"), "0123456789")
})

test("the surrounding Thai is left exactly as written", () => {
  // Straight from an announcement: only the digits may change.
  assert.equal(
    toArabicDigits("เครื่องพิมพ์แบบใช้ความร้อน จำนวน ๑๗ เครื่อง"),
    "เครื่องพิมพ์แบบใช้ความร้อน จำนวน 17 เครื่อง"
  )
  assert.equal(
    toArabicDigits("สแกนเนอร์ ระดับศูนย์บริการ แบบที่ ๑ จำนวน ๕๗ เครื่อง"),
    "สแกนเนอร์ ระดับศูนย์บริการ แบบที่ 1 จำนวน 57 เครื่อง"
  )
})

test("text with no Thai numerals is returned unchanged", () => {
  const text = "ประกวดราคาซื้อครุภัณฑ์คอมพิวเตอร์ จำนวน 3 รายการ (e-bidding)"
  assert.equal(toArabicDigits(text), text)
  assert.equal(hasThaiDigits(text), false)
  assert.equal(hasThaiDigits("จำนวน ๓ รายการ"), true)
})

test("Thai letters that neighbour the digit block are not touched", () => {
  // ๐-๙ is U+0E50-U+0E59; the characters either side of that range are real
  // letters and marks, so a sloppy range would corrupt ordinary words.
  const neighbours = "ฯๆ็่้๊๋์ํ๎๚๛"
  assert.equal(toArabicDigits(neighbours), neighbours)
})

test("every string in an extraction is converted, however deeply nested", () => {
  const extraction = {
    title: { th: "ซื้อครุภัณฑ์ จำนวน ๒ รายการ", en: "Purchase of 2 items" },
    deliverables: { th: ["เครื่องพิมพ์ ๑๗ เครื่อง", "สแกนเนอร์ ๕๗ เครื่อง"] },
    financials: { totalBudgetBaht: 2024000, milestones: [{ deliverable: { th: "งวดที่ ๑" } }] },
    aiConfidence: 95,
    nothing: null,
    flag: true,
  }

  assert.deepEqual(toArabicDigitsDeep(extraction), {
    title: { th: "ซื้อครุภัณฑ์ จำนวน 2 รายการ", en: "Purchase of 2 items" },
    deliverables: { th: ["เครื่องพิมพ์ 17 เครื่อง", "สแกนเนอร์ 57 เครื่อง"] },
    financials: { totalBudgetBaht: 2024000, milestones: [{ deliverable: { th: "งวดที่ 1" } }] },
    aiConfidence: 95,
    nothing: null,
    flag: true,
  })
})

test("a Date survives the walk, because a document read from Mongo carries them", () => {
  // The backfill walks documents from `.lean()`, where announcements[].seenAt
  // is a real Date. Rebuilt from its own entries a Date becomes {}, and Mongo
  // then refuses the write with "Cast to date failed at path seenAt".
  const seenAt = new Date("2026-10-07T11:33:58.847Z")
  const walked = toArabicDigitsDeep({
    announcements: [{ announceType: "D0", title: "ซื้อครุภัณฑ์ ๒ รายการ", seenAt }],
  })

  const row = walked.announcements[0]
  assert.ok(row.seenAt instanceof Date)
  assert.equal(row.seenAt.toISOString(), "2026-10-07T11:33:58.847Z")
  assert.equal(row.title, "ซื้อครุภัณฑ์ 2 รายการ")
})

test("numbers, booleans and null survive the walk with their types", () => {
  // The result is validated by zod straight afterwards, so a number quietly
  // turned into a string here would fail the schema rather than the digits.
  const walked = toArabicDigitsDeep({ budget: 2_024_000, ok: false, missing: null })
  assert.equal(typeof walked.budget, "number")
  assert.equal(typeof walked.ok, "boolean")
  assert.equal(walked.missing, null)
})
