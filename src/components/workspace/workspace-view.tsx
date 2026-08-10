"use client"

import { useMemo, useState } from "react"

import { moveWorkspaceCardAction } from "@/actions/workspace"
import { AddTorToColumnDialog } from "@/components/workspace/add-tor-to-column-dialog"
import { WorkspaceCardDetailDialog } from "@/components/workspace/workspace-card-detail-dialog"
import { WorkspaceKanbanBoard } from "@/components/workspace/workspace-kanban-board"
import {
  WorkspaceFilterBar,
  type WorkspaceFiltersState,
} from "@/components/workspace/workspace-filter-bar"
import { filterWorkspaceCards, flattenBoardColumns } from "@/lib/workspace-board"
import type {
  WorkspaceBoardResult,
  WorkspaceCard,
  WorkspaceColumnId,
} from "@/types/workspace"

const initialFilters: WorkspaceFiltersState = {
  keyword: "",
  assigneeId: "all",
  priority: "all",
  torIdInput: "",
}

type WorkspaceViewProps = {
  initialBoard: WorkspaceBoardResult
}

export function WorkspaceView({ initialBoard }: WorkspaceViewProps) {
  const [filters, setFilters] = useState<WorkspaceFiltersState>(initialFilters)
  const [allCards, setAllCards] = useState(() =>
    flattenBoardColumns(initialBoard.columns)
  )
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [addColumnId, setAddColumnId] = useState<WorkspaceColumnId | null>(
    null
  )

  const filteredCards = useMemo(
    () =>
      filterWorkspaceCards(allCards, {
        keyword: filters.keyword,
        assigneeId: filters.assigneeId,
        priority: filters.priority,
      }),
    [allCards, filters.assigneeId, filters.keyword, filters.priority]
  )

  const selectedCard = useMemo(
    () => allCards.find((card) => card.torId === selectedCardId) ?? null,
    [allCards, selectedCardId]
  )

  function handleMoveCard(
    torId: string,
    toColumn: WorkspaceColumnId,
    toIndex: number
  ) {
    void moveWorkspaceCardAction(torId, toColumn, toIndex)
  }

  function handleUpdateCard(updated: WorkspaceCard) {
    setAllCards((previous) =>
      previous.map((card) => (card.torId === updated.torId ? updated : card))
    )
  }

  function handleTorAdded(_card: WorkspaceCard, cards: WorkspaceCard[]) {
    setAllCards(cards)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#F7F7F8]">
      <WorkspaceFilterBar
        filters={filters}
        members={initialBoard.members}
        onChange={setFilters}
        onSearch={() => undefined}
      />

      <div className="min-h-0 flex-1 overflow-x-auto p-4 md:p-6">
        <WorkspaceKanbanBoard
          key={`${filters.keyword}|${filters.assigneeId}|${filters.priority}`}
          cards={filteredCards}
          allCards={allCards}
          onCardsChange={setAllCards}
          onMoveCard={handleMoveCard}
          onOpenCardDetails={setSelectedCardId}
          onRequestAddTor={setAddColumnId}
        />
      </div>

      <WorkspaceCardDetailDialog
        open={selectedCardId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCardId(null)
        }}
        card={selectedCard}
        members={initialBoard.members}
        onUpdateCard={handleUpdateCard}
      />

      <AddTorToColumnDialog
        open={addColumnId !== null}
        columnId={addColumnId}
        existingTorIds={allCards.map((card) => card.torId)}
        onOpenChange={(open) => {
          if (!open) setAddColumnId(null)
        }}
        onAdded={handleTorAdded}
      />
    </div>
  )
}
