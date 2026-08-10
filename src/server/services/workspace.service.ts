import {
  getMockTeamMembers,
  getMockWorkspaceCards,
  setMockWorkspaceCards,
} from "@/server/db/mock/workspace"
import {
  cardsToColumnItems,
  cardsToLookup,
  columnItemsToCards,
  moveCardInColumnItems,
} from "@/lib/workspace-board"
import type {
  WorkspaceBoardResult,
  WorkspaceColumnId,
  WorkspaceQuery,
} from "@/types/workspace"
import { WORKSPACE_COLUMNS } from "@/types/workspace"

function matchesWorkspaceQuery(
  card: ReturnType<typeof getMockWorkspaceCards>[number],
  query: WorkspaceQuery
) {
  if (query.keyword?.trim()) {
    const q = query.keyword.trim().toLowerCase()
    const matches =
      card.title.toLowerCase().includes(q) ||
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

export { WORKSPACE_COLUMNS }
