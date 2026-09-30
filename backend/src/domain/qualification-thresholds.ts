/**
 * Reads the baht figure out of a Thai qualification clause.
 *
 * Used twice: to check the number the extraction model reported against the
 * document it read, and to recover a threshold during backfill for TORs that
 * were extracted before the model was asked for one.
 *
 * Returns null rather than a guess whenever the clause is unclear. A wrong
 * threshold silently marks a bidder eligible or ineligible; a null routes the
 * row to a human, which is the honest failure.
 *
 * Dependency-free, like the rest of src/domain.
 */

/** e-GP documents render amounts in Thai numerals: "๑,๓๑๗,๒๐๐.๐๐ บาท". */
const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙"

function toArabicDigits(text: string): string {
  return text.replace(/[๐-๙]/g, (digit) => String(THAI_DIGITS.indexOf(digit)))
}

/**
 * A number with optional comma groups and decimals: "1,317,200.00", "2000000".
 * Deliberately not anchored — clauses embed the figure in prose.
 */
const AMOUNT = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g

/** "ไม่น้อยกว่า ๒ ล้านบาท" — the multiplier is written, not in the digits. */
const MILLIONS = /(\d+(?:[.,]\d+)?)\s*ล้าน/g

/**
 * Every baht figure the text mentions.
 *
 * This is the honest unit of work for a regex. Deciding *which* figure is the
 * requirement needs to understand the sentence — a capital clause reads
 * "มูลค่าการจัดซื้อจัดจ้างเกิน ๕ ล้านบาท … ต้องมีทุนจดทะเบียนไม่ต่ำกว่า ๒ ล้านบาท",
 * where the first figure is the contract band and the third is the actual
 * requirement. The model reads that correctly; this list is how its answer is
 * checked against the document.
 */
export function amountsIn(text: string): number[] {
  if (!text) return []
  const amounts: number[] = []

  // "N ล้าน" first, removing each as it is read so the multiplier's own digits
  // are not counted again as a bare amount.
  const remainder = toArabicDigits(text).replace(MILLIONS, (_match, digits: string) => {
    const value = Number(digits.replace(/,/g, ""))
    if (Number.isFinite(value) && value > 0) amounts.push(value * 1_000_000)
    return " "
  })

  for (const match of remainder.match(AMOUNT) ?? []) {
    const value = Number(match.replace(/,/g, ""))
    // Below 1,000 baht is never a qualification threshold — those digits are a
    // clause number ("ข้อ 2.1"), a year count, or a percentage, and reading one
    // as an amount would set a threshold every company clears.
    if (Number.isFinite(value) && value >= 1_000) amounts.push(value)
  }

  return [...new Set(amounts)]
}

/**
 * The figure, when the text states exactly one.
 *
 * Several different figures in one clause — "1,500,000 per contract and
 * 3,000,000 in total" — is genuinely ambiguous, and picking one would be a
 * guess. Used where there is no model answer to check, such as the backfill.
 */
export function parseThresholdThb(text: string): number | null {
  const amounts = amountsIn(text)
  return amounts.length === 1 ? amounts[0] : null
}

/** Whether a figure the model reported actually appears in the document. */
export function textStatesAmount(text: string, amount: number): boolean {
  return amountsIn(text).some((value) => sameAmount(value, amount))
}

/**
 * Whether two amounts describe the same threshold.
 *
 * Exact equality, save for the rounding a model does when it reads
 * "๑,๓๑๗,๒๐๐.๐๐" and writes 1317200.
 */
export function sameAmount(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01
}
