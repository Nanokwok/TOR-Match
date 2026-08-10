import { getMockCompanyProfile, getMockTors } from "@/server/db/mock/tors"
import { buildQualificationCheck } from "@/lib/qualification"
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
    tor.title.toLowerCase().includes(q) ||
    tor.department.toLowerCase().includes(q) ||
    tor.announcementNo.toLowerCase().includes(q) ||
    tor.techTags.some((tag) => tag.toLowerCase().includes(q)) ||
    tor.summary.toLowerCase().includes(q)
  )
}

function matchesBudget(tor: Tor, budgetRange?: string) {
  if (!budgetRange || budgetRange === "all") return true
  const range = BUDGET_RANGES[budgetRange]
  if (!range) return true
  return tor.budgetBaht >= range.min && tor.budgetBaht < range.max
}

/**
 * Application service for TOR listings.
 * Today this reads mock data; replace the data source only —
 * keep this function signature for pages / server actions.
 */
export async function listTors(
  query: TorListQuery = {}
): Promise<TorListResult> {
  // TODO: replace with DB/API client, e.g. prisma.tor.findMany(...)
  const items = getMockTors().filter((tor) => {
    if (query.eligibleOnly && !tor.eligible) return false
    if (query.status && query.status !== "all" && tor.status !== query.status) {
      return false
    }
    if (
      query.department &&
      query.department !== "all" &&
      tor.department !== query.department
    ) {
      return false
    }
    if (!matchesBudget(tor, query.budgetRange)) return false
    if (!matchesKeyword(tor, query.keyword)) return false
    return true
  })

  return { items, total: items.length }
}

export async function getTorById(id: string): Promise<Tor | null> {
  // TODO: replace with DB/API client, e.g. prisma.tor.findUnique(...)
  return getMockTors().find((tor) => tor.id === id) ?? null
}

export async function listTorDepartments(): Promise<string[]> {
  const departments = new Set(getMockTors().map((tor) => tor.department))
  return [...departments].sort()
}

export async function getTorFinancials(
  torId: string
): Promise<TorFinancials | null> {
  // TODO: replace with DB/API client
  const tor = getMockTors().find((item) => item.id === torId)
  return tor?.financials ?? null
}

export async function getTorQualificationCheck(
  torId: string
): Promise<TorQualificationCheck | null> {
  // TODO: replace with DB/API + company profile service
  const tor = getMockTors().find((item) => item.id === torId)
  if (!tor) return null

  return buildQualificationCheck(tor, getMockCompanyProfile())
}

