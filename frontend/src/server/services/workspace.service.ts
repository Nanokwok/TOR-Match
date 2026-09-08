import { localizedIncludes } from "@/lib/localized-content"
import {
  getMockTeamMembers,
  getMockWorkspaceCards,
  setMockWorkspaceCards,
} from "@/server/db/mock/workspace"
import { getMockTors } from "@/server/db/mock/tors"
import {
  cardsToColumnItems,
  cardsToLookup,
  columnItemsToCards,
  moveCardInColumnItems,
} from "@/lib/workspace-board"
import type { Tor } from "@/types/tor"
import type {
  WorkspaceBoardResult,
  WorkspaceCard,
  WorkspaceColumnId,
  WorkspaceQuery,
} from "@/types/workspace"
import { WORKSPACE_COLUMNS } from "@/types/workspace"

function torToWorkspaceCard(
  tor: Tor,
  column: WorkspaceColumnId
): WorkspaceCard {
  return {
    torId: tor.id,
    announcementNo: tor.announcementNo,
    title: tor.title,
    department: tor.department,
    budgetBaht: tor.budgetBaht,
    deadline: tor.deadline,
    priority: "MEDIUM",
    column,
    assigneeIds: [],
  }
}

function matchesWorkspaceQuery(
  card: ReturnType<typeof getMockWorkspaceCards>[number],
  query: WorkspaceQuery
) {
  if (query.keyword?.trim()) {
    const q = query.keyword.trim().toLowerCase()
    const matches =
      localizedIncludes(card.title, q) ||
      card.announcementNo.toLowerCase().includes(q)
    if (!matches) return false
  }

  if (query.priority && query.priority !== "all" && card.priority !== query.priority) {
    return false
  }

  if (
    query.assigneeId &&
    query.assigneeId !== "all" &&
    !card.assigneeIds.includes(query.assigneeId)
  ) {
    return false
  }

  return true
}

function groupByColumn(
  cards: ReturnType<typeof getMockWorkspaceCards>
): Record<WorkspaceColumnId, ReturnType<typeof getMockWorkspaceCards>> {
  const grouped: Record<WorkspaceColumnId, ReturnType<typeof getMockWorkspaceCards>> =
    {
      bookmark: [],
      todo: [],
      "in-progress": [],
      done: [],
    }

  for (const card of cards) {
    grouped[card.column].push(card)
  }

  return grouped
}

/**
 * Application service for the Team Workspace board.
 * Today this reads mock data; replace the data source only —
 * keep this function signature for pages / server actions.
 */
export async function getWorkspaceBoard(
  query: WorkspaceQuery = {}
): Promise<WorkspaceBoardResult> {
  // TODO: replace with DB/API client
  const members = getMockTeamMembers()
  const cards = getMockWorkspaceCards().filter((card) =>
    matchesWorkspaceQuery(card, query)
  )

  return {
    columns: groupByColumn(cards),
    members,
    total: cards.length,
  }
}

export async function listWorkspaceAssignees() {
  return getMockTeamMembers()
}

export async function moveWorkspaceCard(
  torId: string,
  toColumn: WorkspaceColumnId,
  toIndex: number
) {
  const cards = getMockWorkspaceCards()
  const lookup = cardsToLookup(cards)
  const items = moveCardInColumnItems(
    cardsToColumnItems(cards),
    torId,
    toColumn,
    toIndex
  )
  const nextCards = columnItemsToCards(items, lookup)
  setMockWorkspaceCards(nextCards)
  return nextCards
}

export async function searchTorsForWorkspace(keyword = "") {
  const q = keyword.trim().toLowerCase()
  const tors = getMockTors()

  if (!q) return tors.slice(0, 12)

  return tors
    .filter((tor) => {
      return (
        tor.id.toLowerCase().includes(q) ||
        tor.announcementNo.toLowerCase().includes(q) ||
        localizedIncludes(tor.title, q)
      )
    })
    .slice(0, 20)
}

export async function addTorToWorkspace(
  torId: string,
  column: WorkspaceColumnId
): Promise<
  | { ok: true; card: WorkspaceCard; cards: WorkspaceCard[] }
  | { ok: false; error: string }
> {
  const tor = getMockTors().find(
    (item) =>
      item.id === torId ||
      item.announcementNo.toLowerCase() === torId.trim().toLowerCase()
  )

  if (!tor) {
    return { ok: false, error: "TOR not found" }
  }

  const cards = getMockWorkspaceCards()
  const existing = cards.find((card) => card.torId === tor.id)

  if (existing) {
    if (existing.column === column) {
      return { ok: false, error: "This TOR is already in this column" }
    }

    const lookup = cardsToLookup(cards)
    const items = moveCardInColumnItems(
      cardsToColumnItems(cards),
      existing.torId,
      column,
      0
    )
    const nextCards = columnItemsToCards(items, lookup)
    setMockWorkspaceCards(nextCards)
    const moved = nextCards.find((card) => card.torId === tor.id)!
    return { ok: true, card: moved, cards: nextCards }
  }

  const card = torToWorkspaceCard(tor, column)
  const nextCards = [card, ...cards]
  setMockWorkspaceCards(nextCards)
  return { ok: true, card, cards: nextCards }
}

export async function removeWorkspaceCard(
  torId: string
): Promise<
  | { ok: true; cards: WorkspaceCard[] }
  | { ok: false; error: string }
> {
  const cards = getMockWorkspaceCards()
  const exists = cards.some((card) => card.torId === torId)

  if (!exists) {
    return { ok: false, error: "Card not found" }
  }

  const nextCards = cards.filter((card) => card.torId !== torId)
  setMockWorkspaceCards(nextCards)
  return { ok: true, cards: nextCards }
}

export { WORKSPACE_COLUMNS }
