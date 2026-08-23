import type {
  WorkspaceCard,
  WorkspaceColumnId,
  WorkspaceQuery,
} from "@/types/workspace"
import { WORKSPACE_COLUMNS } from "@/types/workspace"

export type ColumnItems = Record<WorkspaceColumnId, string[]>

export function cardsToLookup(
  cards: WorkspaceCard[]
): Record<string, WorkspaceCard> {
  return Object.fromEntries(cards.map((card) => [card.torId, card]))
}

export function flattenBoardColumns(
  columns: Record<WorkspaceColumnId, WorkspaceCard[]>
): WorkspaceCard[] {
  return WORKSPACE_COLUMNS.flatMap((column) => columns[column.id])
}

export function cardsToColumnItems(cards: WorkspaceCard[]): ColumnItems {
  const items: ColumnItems = {
    bookmark: [],
    todo: [],
    "in-progress": [],
    done: [],
  }

  for (const column of WORKSPACE_COLUMNS) {
    items[column.id] = cards
      .filter((card) => card.column === column.id)
      .map((card) => card.torId)
  }

  return items
}

export function columnItemsToCards(
  items: ColumnItems,
  cardsById: Record<string, WorkspaceCard>
): WorkspaceCard[] {
  return WORKSPACE_COLUMNS.flatMap((column) =>
    items[column.id].map((torId) => ({
      ...cardsById[torId],
      column: column.id,
    }))
  )
}

export function findCardColumn(
  cardId: string,
  items: ColumnItems
): WorkspaceColumnId | undefined {
  return WORKSPACE_COLUMNS.find((column) =>
    items[column.id].includes(cardId)
  )?.id
}

export function resolveDropContainer(
  id: string,
  items: ColumnItems
): WorkspaceColumnId | undefined {
  if (WORKSPACE_COLUMNS.some((column) => column.id === id)) {
    return id as WorkspaceColumnId
  }

  return findCardColumn(id, items)
}

export function filterWorkspaceCards(
  cards: WorkspaceCard[],
  query: WorkspaceQuery
): WorkspaceCard[] {
  return cards.filter((card) => {
    if (query.keyword?.trim()) {
      const q = query.keyword.trim().toLowerCase()
      const matches =
        card.title.toLowerCase().includes(q) ||
        card.announcementNo.toLowerCase().includes(q)
      if (!matches) return false
    }

    if (
      query.priority &&
      query.priority !== "all" &&
      card.priority !== query.priority
    ) {
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
  })
}

export function mergeColumnItemsIntoCards(
  allCards: WorkspaceCard[],
  columnItems: ColumnItems
): WorkspaceCard[] {
  const lookup = cardsToLookup(allCards)
  const updatedFromBoard = columnItemsToCards(columnItems, lookup)
  const updatedIds = new Set(updatedFromBoard.map((card) => card.torId))

  const untouched = allCards.filter((card) => !updatedIds.has(card.torId))

  return [...updatedFromBoard, ...untouched]
}

export type MoveWorkspaceCardInput = {
  torId: string
  toColumn: WorkspaceColumnId
  toIndex: number
}

export function moveCardInColumnItems(
  items: ColumnItems,
  torId: string,
  toColumn: WorkspaceColumnId,
  toIndex: number
): ColumnItems {
  const fromColumn = findCardColumn(torId, items)
  if (!fromColumn) return items

  const next: ColumnItems = {
    bookmark: [...items.bookmark],
    todo: [...items.todo],
    "in-progress": [...items["in-progress"]],
    done: [...items.done],
  }

  next[fromColumn] = next[fromColumn].filter((id) => id !== torId)
  const target = [...next[toColumn]]
  target.splice(toIndex, 0, torId)
  next[toColumn] = target

  return next
}
