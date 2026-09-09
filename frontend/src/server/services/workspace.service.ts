import { ApiRequestError, apiFetch, getAuthToken } from "@/lib/api-client"
import { localizedIncludes } from "@/lib/localized-content"
import { localizedText } from "@/types/localized"
import { getMockTeamMembers } from "@/server/db/mock/workspace"
import { getMockTors } from "@/server/db/mock/tors"
import {
  filterWorkspaceCards,
} from "@/lib/workspace-board"
import type { LocalizedText } from "@/types/localized"
import type { Tor, TorPriority } from "@/types/tor"
import type {
  WorkspaceBoardResult,
  WorkspaceCard,
  WorkspaceColumnId,
  WorkspaceQuery,
} from "@/types/workspace"
import { WORKSPACE_COLUMNS } from "@/types/workspace"

type BackendLocalized = { en?: string; th?: string }

type BackendTor = {
  _id: string
  announcementNo: string
  title?: BackendLocalized
  department?: BackendLocalized
  localOffice?: BackendLocalized
  budgetBaht?: number
  projectScale?: Tor["projectScale"]
  durationDays?: number
  method?: Tor["method"]
  status?: Tor["status"]
  deadline?: string
  announcementDate?: string
  sourceUrl?: string
  summary?: BackendLocalized
  deliverables?: { en?: string[]; th?: string[] }
  techTags?: string[]
  listTags?: string[]
  financials?: Tor["financials"]
  qualificationRequirements?: Tor["qualificationRequirements"]
}

type BackendWorkspaceCard = {
  _id: string
  torId: string | BackendTor
  column: WorkspaceColumnId
  priority?: TorPriority
  assigneeIds?: Array<string | { toString(): string }>
}

type BackendBoardResponse = {
  columns: Partial<Record<WorkspaceColumnId, BackendWorkspaceCard[]>>
  total: number
}

function toLocalized(
  value: BackendLocalized | undefined,
  fallback = ""
): LocalizedText {
  const en = value?.en?.trim() || fallback
  const th = value?.th?.trim() || en
  return localizedText(en, th)
}

function emptyColumns(): Record<WorkspaceColumnId, WorkspaceCard[]> {
  return {
    bookmark: [],
    todo: [],
    "in-progress": [],
    done: [],
  }
}

function groupByColumn(
  cards: WorkspaceCard[]
): Record<WorkspaceColumnId, WorkspaceCard[]> {
  const grouped = emptyColumns()
  for (const card of cards) {
    grouped[card.column].push(card)
  }
  return grouped
}

function mapBackendCard(raw: BackendWorkspaceCard): WorkspaceCard {
  const tor =
    typeof raw.torId === "object" && raw.torId !== null ? raw.torId : null
  const torId = tor ? String(tor._id) : String(raw.torId)

  return {
    id: String(raw._id),
    torId,
    announcementNo: tor?.announcementNo ?? "",
    title: toLocalized(tor?.title, tor?.announcementNo || "TOR"),
    department: toLocalized(tor?.department),
    budgetBaht: tor?.budgetBaht ?? 0,
    deadline: tor?.deadline ?? "",
    priority: raw.priority ?? "MEDIUM",
    column: raw.column,
    assigneeIds: (raw.assigneeIds ?? []).map(String),
  }
}

function mapBackendTorToTor(raw: BackendTor): Tor {
  const id = String(raw._id)
  return {
    id,
    announcementNo: raw.announcementNo,
    title: toLocalized(raw.title, raw.announcementNo),
    department: toLocalized(raw.department),
    localOffice: toLocalized(raw.localOffice),
    budgetBaht: raw.budgetBaht ?? 0,
    projectScale: raw.projectScale ?? "MEDIUM",
    durationDays: raw.durationDays ?? 0,
    method: raw.method ?? "e-bidding",
    status: raw.status ?? "open",
    eligible: true,
    bookmarked: false,
    deadline: raw.deadline ?? "",
    announcementDate: raw.announcementDate ?? "",
    sourceUrl: raw.sourceUrl ?? "",
    summary: toLocalized(raw.summary),
    deliverables: {
      en: raw.deliverables?.en ?? [],
      th: raw.deliverables?.th ?? raw.deliverables?.en ?? [],
    },
    techTags: raw.techTags ?? [],
    listTags: raw.listTags ?? [],
    financials: raw.financials ?? {
      totalBudgetBaht: raw.budgetBaht ?? 0,
      medianPriceBaht: raw.budgetBaht ?? 0,
      method: raw.method ?? "e-bidding",
      milestones: [],
    },
    qualificationRequirements: raw.qualificationRequirements ?? [],
  }
}

async function fetchBoardCards(): Promise<WorkspaceCard[]> {
  const data = await apiFetch<BackendBoardResponse>("/workspace/board")
  return WORKSPACE_COLUMNS.flatMap((column) =>
    (data.columns[column.id] ?? []).map(mapBackendCard)
  )
}

async function resolveBackendTorId(torIdOrKey: string): Promise<string | null> {
  const key = torIdOrKey.trim()
  if (!key) return null
  if (/^[a-f\d]{24}$/i.test(key)) return key

  const mock = getMockTors().find(
    (tor) =>
      tor.id === key ||
      tor.announcementNo.toLowerCase() === key.toLowerCase()
  )
  const announcementNo = mock?.announcementNo ?? key

  const { items } = await apiFetch<{ items: BackendTor[]; total: number }>(
    `/tors?keyword=${encodeURIComponent(announcementNo)}`
  )
  const match =
    items.find(
      (item) =>
        item.announcementNo.toLowerCase() === announcementNo.toLowerCase()
    ) ?? items[0]

  return match ? String(match._id) : null
}

/**
 * Application service for the Team Workspace board.
 * Persists via the Express WorkspaceCard API (per-user ownerId).
 */
export async function getWorkspaceBoard(
  query: WorkspaceQuery = {}
): Promise<WorkspaceBoardResult> {
  const members = getMockTeamMembers()

  const token = await getAuthToken()
  if (!token) {
    return { columns: emptyColumns(), members, total: 0 }
  }

  try {
    const cards = filterWorkspaceCards(await fetchBoardCards(), query)
    return {
      columns: groupByColumn(cards),
      members,
      total: cards.length,
    }
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return { columns: emptyColumns(), members, total: 0 }
    }
    throw error
  }
}

export async function listWorkspaceAssignees() {
  return getMockTeamMembers()
}

export async function moveWorkspaceCard(
  torId: string,
  toColumn: WorkspaceColumnId,
  _toIndex: number
) {
  const cards = await fetchBoardCards()
  const card = cards.find((item) => item.torId === torId)
  if (!card) {
    throw new ApiRequestError(404, "Card not found")
  }

  await apiFetch(`/workspace/cards/${card.id}/move`, {
    method: "PATCH",
    body: JSON.stringify({ column: toColumn }),
  })

  return fetchBoardCards()
}

export async function searchTorsForWorkspace(keyword = "") {
  const q = keyword.trim()
  const path = q
    ? `/tors?keyword=${encodeURIComponent(q)}`
    : "/tors"

  try {
    const { items } = await apiFetch<{ items: BackendTor[]; total: number }>(
      path
    )
    return items.slice(0, q ? 20 : 12).map(mapBackendTorToTor)
  } catch (error) {
    // Fall back to mock catalog if the TOR API is unavailable.
    if (!(error instanceof ApiRequestError)) throw error
    const tors = getMockTors()
    if (!q) return tors.slice(0, 12)
    const lower = q.toLowerCase()
    return tors
      .filter(
        (tor) =>
          tor.id.toLowerCase().includes(lower) ||
          tor.announcementNo.toLowerCase().includes(lower) ||
          localizedIncludes(tor.title, lower)
      )
      .slice(0, 20)
  }
}

export async function addTorToWorkspace(
  torId: string,
  column: WorkspaceColumnId
): Promise<
  | { ok: true; card: WorkspaceCard; cards: WorkspaceCard[] }
  | { ok: false; error: string }
> {
  const token = await getAuthToken()
  if (!token) {
    return { ok: false, error: "You must be signed in to add a TOR." }
  }

  try {
    const backendTorId = await resolveBackendTorId(torId)
    if (!backendTorId) {
      return { ok: false, error: "TOR not found" }
    }

    const existingCards = await fetchBoardCards()
    const existing = existingCards.find((card) => card.torId === backendTorId)

    if (existing) {
      if (existing.column === column) {
        return { ok: false, error: "This TOR is already in this column" }
      }

      await apiFetch(`/workspace/cards/${existing.id}/move`, {
        method: "PATCH",
        body: JSON.stringify({ column }),
      })
    } else {
      await apiFetch("/workspace/cards", {
        method: "POST",
        body: JSON.stringify({ torId: backendTorId, column }),
      })
    }

    const cards = await fetchBoardCards()
    const card = cards.find((item) => item.torId === backendTorId)
    if (!card) {
      return { ok: false, error: "Failed to load workspace card after save" }
    }

    return { ok: true, card, cards }
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { ok: false, error: error.message }
    }
    console.error("addTorToWorkspace failed", error)
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}

export async function removeWorkspaceCard(
  torId: string
): Promise<
  | { ok: true; cards: WorkspaceCard[] }
  | { ok: false; error: string }
> {
  const token = await getAuthToken()
  if (!token) {
    return { ok: false, error: "You must be signed in to remove a card." }
  }

  try {
    const cards = await fetchBoardCards()
    const card = cards.find((item) => item.torId === torId)
    if (!card) {
      return { ok: false, error: "Card not found" }
    }

    await apiFetch(`/workspace/cards/${card.id}`, { method: "DELETE" })
    return { ok: true, cards: cards.filter((item) => item.torId !== torId) }
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { ok: false, error: error.message }
    }
    console.error("removeWorkspaceCard failed", error)
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}

export { WORKSPACE_COLUMNS }
