"use client"

import { useMemo, useState } from "react"

import {
  moveWorkspaceCardAction,
  removeWorkspaceCardAction,
  updateWorkspaceCardAction,
} from "@/actions/workspace"
import { AddTorToColumnDialog } from "@/components/workspace/add-tor-to-column-dialog"
import { WorkspaceCardDetailDialog } from "@/components/workspace/workspace-card-detail-dialog"
import { WorkspaceEmptyState } from "@/components/workspace/workspace-empty-state"
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
  initialTorId?: string | null
  initialTab?: "details" | "checklist"
}

export function WorkspaceView({
  initialBoard,
  initialTorId,
  initialTab,
}: WorkspaceViewProps) {
  const [filters, setFilters] = useState<WorkspaceFiltersState>(initialFilters)
  const [allCards, setAllCards] = useState(() =>
    flattenBoardColumns(initialBoard.columns)
  )
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    initialTorId ?? null
  )
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
    () =>
      allCards.find(
        (card) => card.torId === selectedCardId || card.id === selectedCardId
      ) ?? null,
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
      previous.map((card) =>
        card.id === updated.id || card.torId === updated.torId ? updated : card
      )
    )
    void updateWorkspaceCardAction(updated.id, {
      priority: updated.priority,
      column: updated.column,
      assigneeIds: updated.assigneeIds,
      checklist: updated.checklist,
    })
  }

  function handleTorAdded(_card: WorkspaceCard, cards: WorkspaceCard[]) {
    setAllCards(cards)
  }

  function handleDeleteCard(torId: string, cardId?: string) {
    setAllCards((previous) =>
      previous.filter((card) => {
        if (cardId && card.id === cardId) return false
        if (torId && torId !== "null" && card.torId === torId) return false
        return true
      })
    )
    setSelectedCardId((current) =>
      current === torId || (cardId && current === cardId) ? null : current
    )
    void removeWorkspaceCardAction(torId, cardId)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted">
      <WorkspaceFilterBar
        filters={filters}
        members={initialBoard.members}
        onChange={setFilters}
        onSearch={() => undefined}
      />

      <div className="min-h-0 flex-1 overflow-x-auto p-4 md:p-6">
        {allCards.length === 0 ? (
          <WorkspaceEmptyState
            variant="board"
            onAddTor={() => setAddColumnId("bookmark")}
          />
        ) : filteredCards.length === 0 ? (
          <WorkspaceEmptyState
            variant="filters"
            onClearFilters={() => setFilters(initialFilters)}
          />
        ) : (
          <WorkspaceKanbanBoard
            key={`${filters.keyword}|${filters.assigneeId}|${filters.priority}`}
            cards={filteredCards}
            allCards={allCards}
            onCardsChange={setAllCards}
            onMoveCard={handleMoveCard}
            onOpenCardDetails={setSelectedCardId}
            onDeleteCard={handleDeleteCard}
            onRequestAddTor={setAddColumnId}
          />
        )}
      </div>

      <WorkspaceCardDetailDialog
        open={selectedCardId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCardId(null)
        }}
        card={selectedCard}
        members={initialBoard.members}
        onUpdateCard={handleUpdateCard}
        initialTab={initialTab}
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
