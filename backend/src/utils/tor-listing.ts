import { parseThaiDateTime } from "@/utils/thai-time"

export const TOR_SORTS = ["opened-desc", "opened-asc", "budget-desc", "budget-asc"] as const
export type TorSort = (typeof TOR_SORTS)[number]
export const DEFAULT_TOR_SORT: TorSort = "opened-desc"

type Dated = { status?: string; deadline?: string; announcementDate?: string; budgetBaht?: number }

/**
 * Pure: still taking bids. The stored status is only what the announcement said
 * when it was read, so a deadline that has since passed also ends it. A TOR with
 * no deadline is a draft tender document, not an open one.
 */
export function isOpenForBids(tor: Dated, now = new Date()): boolean {
  if (tor.status !== "open" && tor.status !== "closing-soon") return false
  const deadline = parseThaiDateTime(tor.deadline)
  return deadline !== null && deadline.getTime() > now.getTime()
}

export function isTorSort(value: unknown): value is TorSort {
  return (TOR_SORTS as readonly unknown[]).includes(value)
}

/**
 * Pure: a sorted copy. "opened" is the announcement date. A TOR missing the
 * value being sorted on goes last in either direction, and ties keep their
 * incoming order (newest-stored first).
 */
export function sortTors<T extends Dated>(items: readonly T[], sort: TorSort): T[] {
  const direction = sort.endsWith("desc") ? -1 : 1
  const value = (tor: T): number | null =>
    sort.startsWith("budget")
      ? typeof tor.budgetBaht === "number" ? tor.budgetBaht : null
      : parseThaiDateTime(tor.announcementDate)?.getTime() ?? null

  return items
    .map((tor, index) => ({ tor, index, at: value(tor) }))
    .sort((a, b) => {
      if (a.at === null && b.at === null) return a.index - b.index
      if (a.at === null) return 1
      if (b.at === null) return -1
      return a.at === b.at ? a.index - b.index : (a.at - b.at) * direction
    })
    .map((entry) => entry.tor)
}
