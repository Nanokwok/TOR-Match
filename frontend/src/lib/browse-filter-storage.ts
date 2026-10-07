import { BROWSE_SORTS, DEFAULT_BROWSE_SORT, EMPTY_DETAIL_FILTERS } from "@/lib/browse-filters"
import type { TorDetailFilters, TorProcurementStatus, TorSort } from "@/types/tor"

/**
 * The browse filters remembered between visits, in localStorage.
 *
 * Left out on purpose: the search text (a one-off query, not a filter) and the
 * "open for bids only" switch, which lives in a cookie so the server can render
 * the first page with it (see preferences.ts).
 */
export type StoredBrowseFilters = {
  sort: TorSort
  budgetRange: string
  status: TorProcurementStatus | "all"
  department: string
  detail: TorDetailFilters
}

const STORAGE_KEY = "tor-match:browse-filters"
const STATUSES = ["all", "draft", "open", "closing-soon", "closed", "awarded"]

/** Keeps a saved detail filter only where it has the same shape as the default, so an old save cannot break the dialog. */
function sanitizeDetail(value: unknown): TorDetailFilters {
  const saved = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const detail: Record<string, unknown> = { ...EMPTY_DETAIL_FILTERS }
  for (const [key, fallback] of Object.entries(EMPTY_DETAIL_FILTERS)) {
    const candidate = saved[key]
    const sameShape = Array.isArray(fallback) ? Array.isArray(candidate) : typeof candidate === typeof fallback
    if (sameShape) detail[key] = candidate
  }
  return detail as TorDetailFilters
}

/** Pure: turns whatever was in storage into a safe value, or null when there is nothing usable. */
export function parseStoredBrowseFilters(raw: string | null): StoredBrowseFilters | null {
  if (!raw) return null
  try {
    const saved = JSON.parse(raw) as Record<string, unknown>
    if (!saved || typeof saved !== "object") return null
    return {
      sort: BROWSE_SORTS.includes(saved.sort as TorSort) ? (saved.sort as TorSort) : DEFAULT_BROWSE_SORT,
      budgetRange: typeof saved.budgetRange === "string" ? saved.budgetRange : "all",
      status: STATUSES.includes(saved.status as string)
        ? (saved.status as StoredBrowseFilters["status"])
        : "all",
      department: typeof saved.department === "string" ? saved.department : "all",
      detail: sanitizeDetail(saved.detail),
    }
  } catch {
    return null
  }
}

export function readStoredBrowseFilters(): StoredBrowseFilters | null {
  try {
    return parseStoredBrowseFilters(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function writeStoredBrowseFilters(filters: StoredBrowseFilters): void {
  try {
    const { sort, budgetRange, status, department, detail } = filters
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sort, budgetRange, status, department, detail })
    )
  } catch {
    // Private mode or a full quota: the filters simply are not remembered.
  }
}

let cachedRaw: string | null | undefined
let cachedValue: StoredBrowseFilters | null = null

/**
 * For useSyncExternalStore: the saved filters, as the same object for as long as
 * the stored text is unchanged (the hook needs a stable snapshot). On the
 * server there is no storage, so the matching server snapshot is just `null`.
 */
export function getStoredBrowseFiltersSnapshot(): StoredBrowseFilters | null {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    raw = null
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedValue = parseStoredBrowseFilters(raw)
  }
  return cachedValue
}
