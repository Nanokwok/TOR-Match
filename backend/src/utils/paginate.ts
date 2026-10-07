export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 50

export type Page<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function positiveInt(value: unknown): number | null {
  const number = Math.floor(Number(value))
  return Number.isFinite(number) && number > 0 ? number : null
}

/**
 * Cuts one page out of an already filtered list. A page past the end lands on
 * the last page instead of returning nothing — filters shrink the list under a
 * user who is on page 5.
 */
export function paginate<T>(items: T[], page: unknown, pageSize: unknown): Page<T> {
  const size = Math.min(positiveInt(pageSize) ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(positiveInt(page) ?? 1, totalPages)
  return {
    items: items.slice((current - 1) * size, current * size),
    total: items.length,
    page: current,
    pageSize: size,
    totalPages,
  }
}
