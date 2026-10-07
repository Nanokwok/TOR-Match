/** Only what screening reads, so this survives a change of ingestion source. */
export type ScreenableAnnouncement = { title: string }

/**
 * Keeps ingestion on software work.
 *
 * The feed carries every kind of government purchase and almost none of it is
 * software: without this filter a run spends its extraction budget reading
 * PDFs about cleaning contracts and rubbish trucks. This is a title heuristic
 * and it is free, so it runs before anything downloads a document.
 *
 * It used to be the first of three stages; the other two read the BMA detail
 * page, which went with the Playwright scraper.
 */

/**
 * Boilerplate that appears in most announcement titles regardless of subject.
 *
 * "ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์" is the *procurement method* (e-bidding),
 * not the work — leaving it in made every title containing it look like IT.
 */
const TITLE_BOILERPLATE = [
  /ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์/g,
  /วิธีประกวดราคาอิเล็กทรอนิกส์/g,
  /ประกวดราคาอิเล็กทรอนิกส์/g,
  /\(e-?bidding\)/gi,
  /e-?bidding/gi,
  /ด้วยวิธีเฉพาะเจาะจง/g,
  /โดยวิธีเฉพาะเจาะจง/g,
  /ด้วยวิธีคัดเลือก/g,
  /โดยวิธีคัดเลือก/g,
  /ด้วยวิธีตลาดอิเล็กทรอนิกส์/g,
  /วิธีตลาดอิเล็กทรอนิกส์/g,
  /\(e-?market\)/gi,
]

function withoutBoilerplate(title: string): string {
  return TITLE_BOILERPLATE.reduce((text, pattern) => text.replace(pattern, " "), title)
}

/**
 * Subjects that are never software, however the title is worded.
 *
 * Checked before the terms below because procurement titles routinely pair a
 * physical product with a system-sounding word — "เครื่องเอกซเรย์ระบบดิจิตอล"
 * is an X-ray machine, not a digital system.
 */
const EXCLUDED_SUBJECTS = [
  "ซื้อยา", "รายการยา", "เวชภัณฑ์", "ถุงมือ", "ถุงพลาสติก",
  "เอกซเรย์", "เอ็กซเรย์", "ผ่าตัด", "ผู้ป่วย", "โลหิต",
  "อาหาร", "ไม้ดอก", "ไม้ประดับ", "ภูมิทัศน์",
  "รักษาความปลอดภัย", "ทำความสะอาด", "ซักฟอก",
  "ก่อสร้าง", "ปรับปรุงอาคาร", "ระบายน้ำ", "ประปา",
  "เครื่องปรับอากาศ", "ลิฟต์", "รถยนต์", "ยานพาหนะ", "มูลฝอย",
]

/**
 * Terms that on their own make a title worth a detail-page visit.
 *
 * Each names software as the deliverable, not a component of something
 * physical, so one hit is enough.
 */
const STRONG_TERMS = [
  "ซอฟต์แวร์", "software", "โปรแกรม", "program",
  "แอปพลิเคชัน", "แอปพลิเคชั่น", "application",
  "เว็บไซต์", "website", "พอร์ทัล", "portal",
  "แพลตฟอร์ม", "platform", "สารสนเทศ", "ฐานข้อมูล", "database",
  "พัฒนาระบบ", "จัดทำระบบ", "ปรับปรุงระบบ", "บำรุงรักษาระบบ",
  "เทคโนโลยีสารสนเทศ", "คอมพิวเตอร์", "computer", "ไอที",
  "api", "ocr", "cloud", "คลาวด์",
  // Closed-circuit television is systems-integration work — network cameras,
  // recorders, storage and the software that reads them — and it is a large
  // share of what the BMA buys from IT suppliers. Measured over 120 days, 8 of
  // 22 CCTV projects were missed, including "ระบบวิเคราะห์ภาพจากกล้องโทรทัศน์วงจรปิด",
  // because they say "บำรุงรักษากล้อง" rather than "บำรุงรักษาระบบ".
  "กล้องโทรทัศน์วงจรปิด", "กล้องวงจรปิด", "cctv",
]

/**
 * Terms too broad to decide on alone.
 *
 * "ระบบ" is the clearest case: BMA buys an X-ray machine "พร้อมระบบวัดแรงดัน"
 * and solar panels sold as "80 ระบบ". Real software work always pairs it with
 * something from STRONG_TERMS, so a lone weak hit is not enough.
 */
const WEAK_TERMS = [
  "ระบบ", "system", "ดิจิทัล", "ดิจิตอล", "digital",
  "ออนไลน์", "online", "เว็บ", "web", "แอป", "app", "ai",
  // Weak, not strong: a lone "Network" also appears on laser printers, while
  // real work pairs it with something — "ระบบป้องกันเครือข่าย" is two hits.
  "เครือข่าย", "network",
]

/** Is this announcement worth downloading a document for? */
export function titleSuggestsSoftware(listing: ScreenableAnnouncement): boolean {
  const title = withoutBoilerplate(listing.title)
  if (EXCLUDED_SUBJECTS.some((term) => title.includes(term))) return false

  const haystack = title.toLowerCase()
  if (STRONG_TERMS.some((term) => haystack.includes(term))) return true

  // Two weak signals together still count: "ระบบออนไลน์", "ระบบดิจิทัล".
  return WEAK_TERMS.filter((term) => haystack.includes(term)).length >= 2
}
