import { amountsIn } from "@/domain/qualification-thresholds"
import type { QualificationKey } from "@/domain/qualification-taxonomy"

/**
 * Recognises which shared qualification key a Thai clause is asking for.
 *
 * Same approach as scraper/software-filter.ts, for the same reason: Thai is
 * written without spaces, so there is no tokenizer to lean on and plain
 * substring matching is what works. Each list below carries the concrete false
 * positive that put it there.
 *
 * Its job is to second-guess the extraction model, not to replace it — see
 * scraper/qualification-repair.ts for how the two verdicts are reconciled.
 */

/**
 * Clauses that must never become an automated rule, whichever other terms they
 * contain. Checked before everything else, because each of these genuinely
 * contains another key's strong term:
 *
 *  - "มีมูลค่าสุทธิของกิจการ … เมื่อเทียบกับทุนจดทะเบียน" holds ทุนจดทะเบียน, so a
 *    capital-first order would check the wrong profile field and pass a company
 *    on the strength of a number the clause is not about.
 *  - "จดทะเบียนประกอบธุรกิจมาแล้วไม่น้อยกว่า ๓ ปี" holds จดทะเบียน.
 *  - "ไม่เป็นบุคคลล้มละลาย" sits in the same numbered list as "ไม่เป็นผู้ทิ้งงาน"
 *    and is a different legal declaration; `notBlacklisted` is one checkbox
 *    the bidder ticked about one thing.
 *
 * None of these has a company-profile field, so per the project's scope rule
 * they are self-checked by the bidder instead.
 */
const MANUAL_ONLY_TERMS = [
  "มูลค่าสุทธิ",
  "ประกอบธุรกิจ",
  "ล้มละลาย",
  "ความสามารถตามกฎหมาย",
  "เลิกกิจการ",
  "ผู้มีอาชีพ",
  "ระงับการยื่นข้อเสนอ",
  "ผลประโยชน์ร่วมกัน",
  "ขัดขวางการแข่งขัน",
]

type KeyRule = {
  key: Exclude<QualificationKey, "manual" | "past-contract">
  /** One hit decides the key. */
  strong: string[]
  /** Too broad alone; two together decide it. */
  weak: string[]
}

/**
 * Evaluated in order, so a clause matching two keys resolves to the first.
 * Order matters only for `certification` vs `egp-registered`, where a clause
 * can mention an ISO standard while registering on e-GP; the registration is
 * the operative requirement there, so e-GP comes first.
 */
const KEY_RULES: KeyRule[] = [
  {
    key: "egp-registered",
    // "ลงทะเบียน" alone is weak — it also appears in ทุนจดทะเบียน and in
    // จดทะเบียนประกอบธุรกิจ, both of which are other requirements entirely.
    strong: ["e-gp", "egp", "ผู้ค้าอิเล็กทรอนิกส์", "จัดซื้อจัดจ้างภาครัฐ"],
    weak: ["ลงทะเบียน", "ระบบอิเล็กทรอนิกส์"],
  },
  {
    key: "not-blacklisted",
    strong: ["ผู้ทิ้งงาน", "ทิ้งงาน", "blacklist", "บัญชีดำ"],
    weak: [],
  },
  {
    key: "registered-capital",
    strong: ["ทุนจดทะเบียน", "registered capital"],
    weak: [],
  },
  {
    key: "certification",
    // "มาตรฐาน" is weak on purpose: "ต้องดำเนินงานตามมาตรฐานที่ กทม. กำหนด" is a
    // delivery-quality clause, not a certificate the company holds.
    strong: ["iso", "iec", "cmmi", "ใบรับรองระบบ", "ใบรับรองมาตรฐาน"],
    weak: ["มาตรฐาน", "ใบรับรอง", "certification", "certificate"],
  },
  {
    key: "company-size",
    strong: ["ขนาดกิจการ", "วิสาหกิจขนาดกลางและขนาดย่อม", "sme"],
    weak: [],
  },
  {
    key: "specialization",
    // Rarely stated as such in a Thai TOR; kept so an admin-set rule has a key.
    strong: ["ความเชี่ยวชาญเฉพาะด้าน", "specialization"],
    weak: [],
  },
]

/**
 * Past-performance clauses are the one case a term list cannot decide.
 *
 * "มีผลงานประเภทเดียวกันกับงานที่ประกวดราคา" is about the *scope* of the work and
 * needs a human to compare contracts; "มีผลงาน … ไม่น้อยกว่า ๑,๕๐๐,๐๐๐ บาท" is a
 * number the profile can answer. The figure is the discriminator, so this is
 * checked separately from KEY_RULES.
 */
const PAST_WORK_TERMS = ["ผลงาน", "past performance", "ประสบการณ์การทำงาน"]

/**
 * Whether a clause is one of the kinds that must never be automated.
 *
 * Separate from `classifyQualificationKey` returning null, which also happens
 * when a clause simply matches nothing. The difference decides whether the term
 * lists overrule the extraction model or defer to it: a veto is evidence, a
 * shrug is not.
 */
export function isManualOnlyClause(text: string): boolean {
  const haystack = text.toLowerCase()
  return MANUAL_ONLY_TERMS.some((term) => haystack.includes(term))
}

export type KeyVerdict = {
  key: QualificationKey
  /**
   * "strong" means the term list is confident enough to overrule the extraction
   * model; "weak" means it only corroborates.
   */
  strength: "strong" | "weak"
}

/**
 * Classifies a clause, or returns null when no key fits — which the caller
 * treats as "manual", never as a reason to drop the row.
 */
export function classifyQualificationKey(text: string): KeyVerdict | null {
  const haystack = text.toLowerCase()

  if (MANUAL_ONLY_TERMS.some((term) => haystack.includes(term))) return null

  if (PAST_WORK_TERMS.some((term) => haystack.includes(term))) {
    // No figure at all means the clause is about what the work was, not what it
    // cost. Several figures still make it a value clause — which one applies is
    // the extraction's problem, not this one's.
    return amountsIn(text).length === 0 ? null : { key: "past-contract", strength: "strong" }
  }

  for (const rule of KEY_RULES) {
    if (rule.strong.some((term) => haystack.includes(term))) {
      return { key: rule.key, strength: "strong" }
    }
  }

  for (const rule of KEY_RULES) {
    if (rule.weak.filter((term) => haystack.includes(term)).length >= 2) {
      return { key: rule.key, strength: "weak" }
    }
  }

  return null
}
