import test from "node:test"
import assert from "node:assert/strict"
import {
  repairQualifications,
  type ExtractedQualification,
} from "../src/scraper/qualification-repair"
import { qualificationCriteriaSchema } from "../src/validation/qualification"

/** One qualification as the model would hand it over, before verification. */
function extracted(overrides: Partial<ExtractedQualification> = {}): ExtractedQualification {
  return {
    key: "manual",
    requirement: { en: "Requirement", th: "ข้อกำหนด" },
    torCriteria: { en: "Criteria", th: "เกณฑ์" },
    thresholdThb: 0,
    certificationIds: [],
    certificationMode: "any",
    ...overrides,
  }
}

function only(entry: ExtractedQualification) {
  return repairQualifications([entry])[0]
}

test("a model key the vocabulary does not contain becomes manual, keeping the row", () => {
  // One unrecognised row must never cost the whole document — before this, an
  // off-vocabulary value would have failed the extraction parse outright.
  const row = only(extracted({ key: "net-worth", torCriteria: { en: "x", th: "มูลค่าสุทธิของกิจการ" } }))
  assert.equal(row.key, "manual")
  assert.equal(row.criteria.type, "manual")
  assert.equal(row.requirement.th, "ข้อกำหนด")
})

test("the term lists recover a key the model missed", () => {
  const row = only(extracted({
    key: "manual",
    torCriteria: { en: "at least 2,000,000 THB", th: "ทุนจดทะเบียนไม่น้อยกว่า 2,000,000 บาท" },
    thresholdThb: 2_000_000,
  }))
  assert.equal(row.key, "registered-capital")
  assert.deepEqual(row.criteria, { type: "registered-capital", op: ">=", amountThb: 2_000_000 })
})

test("a strong term overrules the model; the model wins a weaker disagreement", () => {
  // Mis-keying is how a company gets checked against the wrong profile field.
  const overruled = only(extracted({
    key: "past-contract",
    torCriteria: { en: "", th: "ทุนจดทะเบียนไม่น้อยกว่า 1,000,000 บาท" },
    thresholdThb: 1_000_000,
  }))
  assert.equal(overruled.key, "registered-capital")

  const kept = only(extracted({
    key: "certification",
    torCriteria: { en: "", th: "ต้องมีใบรับรองตามมาตรฐานที่กำหนด" },
    certificationIds: ["iso-9001"],
  }))
  assert.equal(kept.key, "certification")
})

test("a threshold the document and the model disagree on degrades to manual", () => {
  // Neither number is trusted over the other: a wrong threshold silently
  // mis-qualifies a bidder, a manual row just asks them.
  const row = only(extracted({
    key: "registered-capital",
    torCriteria: { en: "", th: "ทุนจดทะเบียนไม่น้อยกว่า 2,000,000 บาท" },
    thresholdThb: 20_000_000,
  }))
  assert.equal(row.criteria.type, "manual")
  assert.equal(row.key, "manual")
})

test("the document's figure is adopted when the model reports none", () => {
  const row = only(extracted({
    key: "registered-capital",
    torCriteria: { en: "", th: "ทุนจดทะเบียนไม่น้อยกว่า ๘๐๐,๐๐๐ บาท" },
    thresholdThb: 0,
  }))
  assert.deepEqual(row.criteria, { type: "registered-capital", op: ">=", amountThb: 800_000 })
})

test("a numeric rule with no figure anywhere is manual, never a zero threshold", () => {
  // `>= 0` is the failure that motivated this whole pipeline: it passes every
  // company on earth while looking like a configured rule.
  const row = only(extracted({
    key: "registered-capital",
    torCriteria: { en: "", th: "ต้องมีทุนจดทะเบียนตามที่กำหนด" },
    thresholdThb: 0,
  }))
  assert.equal(row.criteria.type, "manual")
})

test("a certification rule naming no known certificate is manual", () => {
  const row = only(extracted({
    key: "certification",
    torCriteria: { en: "", th: "ได้รับการรับรองมาตรฐาน ISO 14001" },
    certificationIds: [],
  }))
  assert.equal(row.criteria.type, "manual")
})

test("repeated keys get ordinal ids in document order", () => {
  const rows = repairQualifications([
    extracted({ key: "certification", torCriteria: { en: "", th: "ISO/IEC 29110" }, certificationIds: ["iso-29110"] }),
    extracted({ key: "certification", torCriteria: { en: "", th: "CMMI Level 2" }, certificationIds: ["cmmi-2"] }),
    extracted({ key: "manual", torCriteria: { en: "", th: "ไม่เป็นบุคคลล้มละลาย" } }),
    extracted({ key: "manual", torCriteria: { en: "", th: "มีความสามารถตามกฎหมาย" } }),
  ])
  assert.deepEqual(rows.map((row) => row.id), ["certification", "certification-2", "manual", "manual-2"])
})

test("every repaired row carries criteria the matcher can parse", () => {
  // The invariant that retires the blanket "insufficient data": a row is either
  // a real rule or an explicit manual one, never an absent field.
  const rows = repairQualifications([
    extracted({ key: "registered-capital", torCriteria: { en: "", th: "ทุนจดทะเบียนไม่น้อยกว่า 2,000,000 บาท" }, thresholdThb: 2_000_000 }),
    extracted({ key: "egp-registered", torCriteria: { en: "", th: "ลงทะเบียนในระบบ e-GP" } }),
    extracted({ key: "not-blacklisted", torCriteria: { en: "", th: "ไม่เป็นผู้ทิ้งงาน" } }),
    extracted({ key: "company-size", torCriteria: { en: "", th: "เป็นวิสาหกิจขนาดกลางและขนาดย่อม" } }),
    extracted({ key: "bogus", torCriteria: { en: "", th: "อะไรก็ไม่รู้" } }),
  ])
  for (const row of rows) {
    assert.equal(qualificationCriteriaSchema.safeParse(row.criteria).success, true, row.id)
    assert.equal(row.key, row.criteria.type, `${row.id} key and criteria type disagree`)
    assert.equal(row.autoCheckable, row.criteria.type !== "manual")
  }
  // Company size has no phrasing a TOR states reliably, so it is admin-only.
  assert.equal(rows[3].criteria.type, "manual")
})
