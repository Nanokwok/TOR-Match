import test from "node:test"
import assert from "node:assert/strict"
import { titleSuggestsSoftware } from "../src/scraper/software-filter"

const suggests = (title: string) => titleSuggestsSoftware({ title })

test("software named as the deliverable is kept", () => {
  assert.equal(suggests("ประกวดราคาจ้างพัฒนาระบบสารสนเทศเพื่อการบริหาร"), true)
  assert.equal(suggests("ซื้อสิทธิ์การใช้งานซอฟต์แวร์ตามโครงการ"), true)
  assert.equal(suggests("จ้างบำรุงรักษาระบบคอมพิวเตอร์และอุปกรณ์"), true)
})

test("CCTV is systems-integration work, however the title words it", () => {
  // Measured: 8 of 22 CCTV projects were being dropped, because they say
  // "บำรุงรักษากล้อง" rather than "บำรุงรักษาระบบ" — the phrase the old list keyed on.
  assert.equal(suggests("ประกวดราคาจ้างค่าบำรุงรักษากล้องโทรทัศน์วงจรปิด (CCTV) โดยรอบเขตพระราชฐาน"), true)
  assert.equal(suggests("ซื้อกล้องวงจรปิดและอุปกรณ์ประกอบพร้อมติดตั้ง จำนวน 6 ชุมชน"), true)
  assert.equal(suggests("ซื้อระบบวิเคราะห์ภาพจากกล้องโทรทัศน์วงจรปิด 1 ระบบ"), true)
})

test("a network term counts only alongside another signal", () => {
  // "ระบบ" + "เครือข่าย" is real work; "Network" alone sells laser printers.
  assert.equal(suggests("ซื้อสิทธิ์การใช้งานระบบป้องกันเครือข่ายตามโครงการเพิ่มประสิทธิภาพ"), true)
  assert.equal(suggests("เช่าเครื่องพิมพ์เลเซอร์ หรือ LED ชนิด Network พร้อมอุปกรณ์ จำนวน 2 รายการ"), false)
})

test("things that merely sound technical stay out", () => {
  // Each of these was in the feed and would be noise on /browse. The fibreglass
  // one is why "ไฟเบอร์" was not added as a term: it is a street-name post.
  assert.equal(suggests("จ้างจัดทำเสาป้ายชื่อถนน ซอย พร้อมไฟเบอร์กลาส"), false)
  assert.equal(suggests("ซื้อโคมไฟถนน LED รองรับระบบอัจฉริยะ ขนาดกำลังวัตต์ไม่เกิน 140 วัตต์"), false)
  assert.equal(suggests("ซื้อวัสดุและครุภัณฑ์ระบบกระจายเสียง สื่อสาร เพื่อการประชาสัมพันธ์ในชุมชน"), false)
  assert.equal(suggests("ซื้อยูนิตทันตกรรมระบบอิเล็กทรอนิกส์ ชนิดให้แสงสว่างที่ปลายหัวกรอแบบ LED"), false)
})

test("excluded subjects win over a technical-sounding word", () => {
  assert.equal(suggests("ซื้อยา dapagliflozin 10 mg film-coated tablet"), false)
  assert.equal(suggests("จ้างเหมาดูแลทรัพย์สินและรักษาความปลอดภัยบริเวณพื้นที่"), false)
  assert.equal(suggests("จ้างก่อสร้างปรับปรุงซอยคู้คลองสิบ 11"), false)
})

test("plant has systems too, and they are not IT work", () => {
  // "บำรุงรักษาระบบ" is a strong term, so anything maintained as a system used
  // to read as IT. These four reached /browse before the exclusions caught them.
  assert.equal(suggests("จ้างเหมาซ่อมบำรุงรักษาระบบทำความเย็นของระบบปรับอากาศ จำนวน 1 งาน"), false)
  assert.equal(suggests("จ้างเหมาบำรุงรักษาระบบอุปกรณ์อาคารและสาธารณูปโภคศูนย์บริการ"), false)
  assert.equal(suggests("ซื้อและติดตั้งโซลาร์รูฟท็อป (Solar Rooftop) ระบบผลิตไฟฟ้าจากพลังงานแสงอาทิตย์"), false)
  assert.equal(suggests("ซื้อเครื่องตรวจอวัยวะภายในด้วยคลื่นเสียงความถี่สูงระบบดิจิตอล 5 หัวตรวจ"), false)
})

test("the exclusions do not catch the network and system work beside them", () => {
  // The same wording that sells an air-conditioning plant also describes real
  // IT maintenance, so the exclusions must be about the subject, not the verb.
  assert.equal(suggests("จ้างเหมาบำรุงรักษาระบบเครือข่ายไร้สาย (Wireless LAN) โรงพยาบาลรัตนประชารักษ์"), true)
  assert.equal(suggests("จ้างจัดหาระบบคลาวด์สำหรับระบบสารสนเทศศูนย์บริการสาธารณสุข"), true)
  assert.equal(suggests("จ้างบำรุงรักษาระบบโทรมาตร"), true)
})
