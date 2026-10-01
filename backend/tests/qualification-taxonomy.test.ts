import test from "node:test"
import assert from "node:assert/strict"
import {
  QUALIFICATION_KEYS,
  QUALIFICATION_TAXONOMY,
  criteriaFingerprint,
  taxonomyEntry,
} from "../src/domain/qualification-taxonomy"
import { qualificationCriteriaSchema } from "../src/validation/qualification"
import { Company } from "../src/models/Company.model"

test("every key has one taxonomy entry, with both locales", () => {
  assert.equal(QUALIFICATION_TAXONOMY.length, QUALIFICATION_KEYS.length)
  for (const key of QUALIFICATION_KEYS) {
    const entry = taxonomyEntry(key)
    assert.ok(entry.label.en.trim(), `${key} has no English label`)
    assert.ok(entry.label.th.trim(), `${key} has no Thai label`)
  }
})

test("every criteria type is a key and every key is a criteria type", () => {
  // The two vocabularies are one vocabulary. Without this a rule could exist
  // that no label, no profile field and no classifier term ever describes.
  const types = qualificationCriteriaSchema.options.map((option) => option.shape.type.value)
  assert.deepEqual([...types].sort(), [...QUALIFICATION_KEYS].sort())
})

test("every profile field names a real path on the Company model", () => {
  // A typo here would not throw — it would make the row report "insufficient
  // data" for ever, which reads as the bidder's fault rather than ours.
  for (const entry of QUALIFICATION_TAXONOMY) {
    if (!entry.profileField) continue
    assert.ok(
      Company.schema.path(entry.profileField.name),
      `${entry.key} points at Company.${entry.profileField.name}, which does not exist`
    )
  }
})

test("only the manual key has no profile field", () => {
  for (const entry of QUALIFICATION_TAXONOMY) {
    assert.equal(entry.profileField === null, entry.key === "manual", `${entry.key}`)
  }
})

test("the fingerprint ignores key order but tracks the Thai clause and the rule", () => {
  const criteria = { type: "registered-capital", op: ">=", amountThb: 2_000_000 }
  const reordered = { amountThb: 2_000_000, type: "registered-capital", op: ">=" }
  const clause = "ทุนจดทะเบียนไม่น้อยกว่า 2,000,000 บาท"

  assert.equal(
    criteriaFingerprint("registered-capital", criteria, clause),
    criteriaFingerprint("registered-capital", reordered, clause)
  )
  // A raised threshold is a different requirement — a bidder's earlier "yes"
  // must not carry over to it.
  assert.notEqual(
    criteriaFingerprint("registered-capital", criteria, clause),
    criteriaFingerprint("registered-capital", { ...criteria, amountThb: 4_000_000 }, clause)
  )
  assert.notEqual(
    criteriaFingerprint("registered-capital", criteria, clause),
    criteriaFingerprint("registered-capital", criteria, `${clause} และชำระแล้วเต็มจำนวน`)
  )
})
