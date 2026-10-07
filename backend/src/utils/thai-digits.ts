/**
 * Thai numerals to Arabic numerals.
 *
 * Government announcements are written with ๐-๙ — "จำนวน ๑๗ เครื่อง", "แบบที่ ๑" —
 * and the model copies the Thai faithfully, as it is told to. The site reads in
 * Arabic digits, so the conversion happens once on the way in rather than in
 * every component that renders a title, a deliverable or a requirement.
 *
 * Done here rather than by asking the model: it is a fixed character mapping,
 * so a replace is exact and free, while an instruction is one more thing for a
 * long prompt to drop. ๐-๙ map one-to-one onto 0-9 with no ambiguity — unlike
 * Buddhist-era years, which are arithmetic and stay the model's job.
 */

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙"

/** Rewrites every Thai numeral in `text`, leaving everything else untouched. */
export function toArabicDigits(text: string): string {
  return text.replace(/[๐-๙]/g, (digit) => String(THAI_DIGITS.indexOf(digit)))
}

/** True when `text` contains a Thai numeral. */
export function hasThaiDigits(text: string): boolean {
  return /[๐-๙]/.test(text)
}

/**
 * Only `{}` and `Object.create(null)` are taken apart.
 *
 * A Date, an ObjectId or a Buffer is an object too, and rebuilding one from its
 * own entries destroys it: a Date has no enumerable properties, so it comes back
 * as `{}` and Mongoose then refuses the write with "Cast to date failed". The
 * model's JSON output never contains one, but a document read with `.lean()`
 * does, and both go through here.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * Applies {@link toArabicDigits} to every string inside a value, however deeply
 * nested, and returns everything else unchanged.
 *
 * Keys are rewritten too — a qualification map keyed by a Thai-numbered clause
 * would otherwise keep its original spelling.
 */
export function toArabicDigitsDeep<T>(value: T): T {
  if (typeof value === "string") return toArabicDigits(value) as unknown as T
  if (Array.isArray(value)) return value.map((item) => toArabicDigitsDeep(item)) as unknown as T
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      out[toArabicDigits(key)] = toArabicDigitsDeep(item)
    }
    return out as unknown as T
  }
  return value
}
