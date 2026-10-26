/**
 * Which page numbers to show, and where to put an ellipsis.
 *
 * Rendering every page was fine while the review queue held a handful of
 * drafts. At 286 drafts and five per page it becomes 58 buttons in a row:
 * the page you are on is lost among them, the first page scrolls off, and the
 * bar is wider than the table it belongs to.
 *
 * So: always the first and last page — the two people actually aim for — plus
 * a short run around the current one, with a gap marker standing in for the
 * rest.
 */

/** A page to link to, or a gap too wide to spell out. */
export type PageSlot = number | "ellipsis"

/**
 * Pages around `current`, never more than `siblings` either side.
 *
 * Returns every page while they still fit, so a short list is unchanged and
 * no ellipsis appears where it would hide a single page — "1 … 3" is both
 * longer and less useful than "1 2 3".
 */
export function pageWindow(current: number, total: number, siblings = 1): PageSlot[] {
  if (total <= 1) return [1]

  // first + last + current + siblings either side + two gap markers
  const maxSlots = siblings * 2 + 5
  if (total <= maxSlots) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const page = Math.min(Math.max(current, 1), total)
  const left = Math.max(page - siblings, 1)
  const right = Math.min(page + siblings, total)

  // A gap of exactly one page is spelled out instead: the marker would take
  // the same room and cost a click.
  const gapLeft = left > 3
  const gapRight = right < total - 2
  // How many pages to show in a row when the window is pinned to one end, so
  // the control keeps the same width wherever you are in the list.
  const run = siblings * 2 + 3

  if (!gapLeft && gapRight) {
    return [...range(1, run), "ellipsis", total]
  }
  if (gapLeft && !gapRight) {
    return [1, "ellipsis", ...range(total - run + 1, total)]
  }
  if (!gapLeft && !gapRight) {
    return range(1, total)
  }
  return [1, "ellipsis", ...range(left, right), "ellipsis", total]
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index)
}
