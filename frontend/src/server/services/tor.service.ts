import {
  getMockCompanyProfile,
  getMockTors,
  listMockLocalOffices,
} from "@/server/db/mock/tors"
import { matchesDetailFilters } from "@/lib/browse-filters"
import { localizedIncludes, localizedKey } from "@/lib/localized-content"
import { buildQualificationCheck } from "@/lib/qualification"
import {
  getBookmarkedTorIndex,
  isTorBookmarked,
} from "@/server/services/workspace.service"
import type { LocalizedText } from "@/types/localized"
import type {
  Tor,
  TorFinancials,
  TorListQuery,
  TorListResult,
  TorQualificationCheck,
} from "@/types/tor"

const BUDGET_RANGES: Record<string, { min: number; max: number }> = {
  "under-3m": { min: 0, max: 3_000_000 },
  "3m-6m": { min: 3_000_000, max: 6_000_000 },
  "6m-10m": { min: 6_000_000, max: 10_000_000 },
  "over-10m": { min: 10_000_000, max: Number.POSITIVE_INFINITY },
}

function matchesKeyword(tor: Tor, keyword?: string) {
  if (!keyword?.trim()) return true
  const q = keyword.trim().toLowerCase()
  return (
    localizedIncludes(tor.title, q) ||
    localizedIncludes(tor.department, q) ||
    localizedIncludes(tor.localOffice, q) ||
    tor.announcementNo.toLowerCase().includes(q) ||
    tor.techTags.some((tag) => tag.toLowerCase().includes(q)) ||
    localizedIncludes(tor.summary, q)
  )
}

function matchesBudget(tor: Tor, budgetRange?: string) {
  if (!budgetRange || budgetRange === "all") return true
  const range = BUDGET_RANGES[budgetRange]
  if (!range) return true
  return tor.budgetBaht >= range.min && tor.budgetBaht < range.max
}

async function withBookmarkedState(items: Tor[]): Promise<Tor[]> {
  const index = await getBookmarkedTorIndex()
  return items.map((tor) => ({
    ...tor,
    bookmarked: isTorBookmarked(tor, index),
  }))
}


export async function listTors(
  query: TorListQuery = {}
): Promise<TorListResult> {
  const filtered = getMockTors().filter((tor) => {
    if (query.eligibleOnly && !tor.eligible) return false
    if (query.status && query.status !== "all" && tor.status !== query.status) {
      return false
    }
    if (
      query.department &&
      query.department !== "all" &&
      localizedKey(tor.department) !== query.department
    ) {
      return false
    }
    if (!matchesBudget(tor, query.budgetRange)) return false
    if (!matchesKeyword(tor, query.keyword)) return false
    if (!matchesDetailFilters(tor, query.detail)) return false
    return true
  })

  const items = await withBookmarkedState(filtered)
  return { items, total: items.length }
}

export async function getTorById(id: string): Promise<Tor | null> {
  const tor = getMockTors().find((item) => item.id === id) ?? null
  if (!tor) return null

  const [withFlag] = await withBookmarkedState([tor])
  return withFlag
}

export async function listTorDepartments(): Promise<LocalizedText[]> {
  const byKey = new Map<string, LocalizedText>()
  for (const tor of getMockTors()) {
    byKey.set(localizedKey(tor.department), tor.department)
  }
  return [...byKey.values()].sort((a, b) => a.en.localeCompare(b.en))
}

export async function listTorLocalOffices(): Promise<string[]> {
  return listMockLocalOffices()
}

export async function getTorFinancials(
  torId: string
): Promise<TorFinancials | null> {
  const tor = getMockTors().find((item) => item.id === torId)
  return tor?.financials ?? null
}

export async function getTorQualificationCheck(
  torId: string
): Promise<TorQualificationCheck | null> {
  const tor = getMockTors().find((item) => item.id === torId)
  if (!tor) return null

  return buildQualificationCheck(tor, getMockCompanyProfile())
}
