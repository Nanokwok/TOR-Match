import test from "node:test"
import assert from "node:assert/strict"
import { classifyQualificationKey, isManualOnlyClause } from "../src/domain/qualification-keys"
import {
  amountsIn,
  parseThresholdThb,
  sameAmount,
  textStatesAmount,
} from "../src/domain/qualification-thresholds"

function key(text: string) {
  return classifyQualificationKey(text)?.key ?? "manual"
}

test("each key is recognised from the wording a Thai tender document uses", () => {
  assert.equal(key("ผู้ยื่นข้อเสนอต้องมีทุนจดทะเบียนไม่น้อยกว่า ๒,๐๐๐,๐๐๐ บาท"), "registered-capital")
  assert.equal(key("มีผลงานประเภทเดียวกัน ในวงเงินไม่น้อยกว่า 1,500,000 บาท"), "past-contract")
  assert.equal(key("ได้รับการรับรองมาตรฐาน ISO/IEC 29110"), "certification")
  assert.equal(key("ต้องลงทะเบียนในระบบจัดซื้อจัดจ้างภาครัฐด้วยอิเล็กทรอนิกส์ (e-GP)"), "egp-registered")
  assert.equal(key("ไม่เป็นบุคคลซึ่งถูกแจ้งเวียนชื่อให้เป็นผู้ทิ้งงานของทางราชการ"), "not-blacklisted")
})

test("net worth is not read as registered capital", () => {
  // The clause names both, and capital is the one with a profile field — so a
  // capital-first order would check the wrong number and pass the bidder on it.
  const clause = "มีมูลค่าสุทธิของกิจการเป็นบวก เมื่อเทียบกับทุนจดทะเบียน"
  assert.equal(key(clause), "manual")
  assert.equal(isManualOnlyClause(clause), true)
})

test("clauses with no profile field behind them stay manual", () => {
  for (const clause of [
    "จดทะเบียนประกอบธุรกิจมาแล้วไม่น้อยกว่า ๓ ปี",
    "ไม่เป็นบุคคลล้มละลาย",
    "มีความสามารถตามกฎหมาย",
    "เป็นผู้มีอาชีพรับจ้างงานที่ประกวดราคาอิเล็กทรอนิกส์ดังกล่าว ซึ่งเป็นนิติบุคคล",
    "ไม่อยู่ระหว่างเลิกกิจการ",
  ]) {
    assert.equal(key(clause), "manual", clause)
  }
})

test("a delivery-quality clause is not a certificate the company holds", () => {
  assert.equal(key("ต้องดำเนินงานตามมาตรฐานที่กรุงเทพมหานครกำหนด"), "manual")
})

test("past work is only a value rule when the clause states a figure", () => {
  // Without a number the clause is about what the work was, which needs a human
  // to compare contracts — the profile only knows what they were worth.
  assert.equal(key("มีผลงานประเภทเดียวกันกับงานที่ประกวดราคา"), "manual")
  assert.equal(key("มีผลงานก่อสร้างในวงเงินไม่น้อยกว่า 2,000,000 บาท"), "past-contract")
})

test("registering on e-GP is not mistaken for registered capital", () => {
  // Both clauses contain จดทะเบียน.
  assert.equal(key("ผู้ยื่นข้อเสนอต้องลงทะเบียนในระบบ e-GP ของกรมบัญชีกลาง"), "egp-registered")
})

test("amounts parse from Thai numerals, comma groups and ล้าน", () => {
  assert.equal(parseThresholdThb("ราคากลาง ๑,๓๑๗,๒๐๐.๐๐ บาท"), 1_317_200)
  assert.equal(parseThresholdThb("ไม่น้อยกว่า 2,000,000 บาท"), 2_000_000)
  assert.equal(parseThresholdThb("ไม่น้อยกว่า 5 ล้านบาท"), 5_000_000)
  assert.equal(parseThresholdThb("ทุนจดทะเบียน 800000 บาท"), 800_000)
})

test("an ambiguous or absent amount parses to nothing rather than a guess", () => {
  // Two different figures: picking either would invent a threshold.
  assert.equal(parseThresholdThb("รายฉบับไม่น้อยกว่า 1,500,000 บาท และรวมไม่น้อยกว่า 3,000,000 บาท"), null)
  assert.equal(parseThresholdThb("มีผลงานประเภทเดียวกัน"), null)
  // Clause numbering and small integers are never thresholds.
  assert.equal(parseThresholdThb("ข้อ 2.1 ผู้ยื่นข้อเสนอต้องมีคุณสมบัติ"), null)
  assert.equal(parseThresholdThb(""), null)
})

test("a clause that states several figures lists them all", () => {
  // Verbatim from announcement 69099316505. The first figure is the contract
  // band the rule applies to and the last is the capital floor; a parser that
  // takes the first one reports 5,000,000 as the requirement.
  const clause =
    "มูลค่าการจัดซื้อจัดจ้างเกิน ๕ ล้านบาท แต่ไม่เกิน ๑๐ ล้านบาท ต้องมีทุนจดทะเบียน ไม่ต่ำกว่า ๒ ล้านบาท"
  assert.deepEqual(amountsIn(clause), [5_000_000, 10_000_000, 2_000_000])
  assert.equal(parseThresholdThb(clause), null)
  // Which one is the requirement is the model's call; this only confirms the
  // figure it chose is really in the document.
  assert.equal(textStatesAmount(clause, 2_000_000), true)
  assert.equal(textStatesAmount(clause, 3_000_000), false)
})

test("a past-work clause with several figures is still a value rule", () => {
  assert.equal(key("มีผลงานไม่น้อยกว่า 1,500,000 บาท และรวมไม่น้อยกว่า 3,000,000 บาท"), "past-contract")
})

test("amounts compare tolerantly enough for a model transcribing decimals", () => {
  assert.equal(sameAmount(1_317_200, 1_317_200.0), true)
  assert.equal(sameAmount(1_317_200, 1_317_201), false)
})
