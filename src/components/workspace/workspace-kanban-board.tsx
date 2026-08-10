"use client"

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useMemo, useState } from "react"

import { KanbanColumn } from "@/components/workspace/kanban-column"
import { WorkspaceTorCard } from "@/components/workspace/workspace-tor-card"
import {
  cardsToColumnItems,
  cardsToLookup,
  findCardColumn,
  mergeColumnItemsIntoCards,
  resolveDropContainer,
  type ColumnItems,
} from "@/lib/workspace-board"
import { WORKSPACE_COLUMNS } from "@/types/workspace"
import type { WorkspaceCard, WorkspaceColumnId } from "@/types/workspace"

function computeDragEndItems(
  currentItems: ColumnItems,
  activeId: string,
  overId: string
): ColumnItems {
  const activeContainer = resolveDropContainer(activeId, currentItems)
  const overContainer = resolveDropContainer(overId, currentItems)

  if (!activeContainer || !overContainer) return currentItems

  if (activeContainer !== overContainer) return currentItems

  const containerItems = currentItems[activeContainer]
  const activeIndex = containerItems.indexOf(activeId)
  const overIndex = containerItems.indexOf(overId)

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return currentItems
  }

  return {
    ...currentItems,
    [activeContainer]: arrayMove(containerItems, activeIndex, overIndex),
  }
}

type WorkspaceKanbanBoardProps = {
  cards: WorkspaceCard[]
  allCards: WorkspaceCard[]
  onCardsChange: (cards: WorkspaceCard[]) => void
  onMoveCard?: (
    torId: string,
    toColumn: WorkspaceColumnId,
    toIndex: number
  ) => void
  onOpenCardDetails?: (torId: string) => void
}

export function WorkspaceKanbanBoard({
  cards,
  allCards,
  onCardsChange,
  onMoveCard,
  onOpenCardDetails,
}: WorkspaceKanbanBoardProps) {
  const cardsById = useMemo(() => cardsToLookup(cards), [cards])
  const derivedColumnItems = useMemo(() => cardsToColumnItems(cards), [cards])
  const [dragColumnItems, setDragColumnItems] = useState<ColumnItems | null>(
    null
  )
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const columnItems = dragColumnItems ?? derivedColumnItems

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const activeCard = activeCardId ? cardsById[activeCardId] : null

  function handleDragStart(event: DragStartEvent) {
    setActiveCardId(String(event.active.id))
    setDragColumnItems(derivedColumnItems)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    setDragColumnItems((previous) => {
      const current = previous ?? derivedColumnItems
      const activeContainer = resolveDropContainer(activeId, current)
      const overContainer = resolveDropContainer(overId, current)

      if (!activeContainer || !overContainer) return current
      if (activeContainer === overContainer) return current

      const activeItems = [...current[activeContainer]]
      const overItems = [...current[overContainer]]
      const activeIndex = activeItems.indexOf(activeId)
      if (activeIndex === -1) return current

      activeItems.splice(activeIndex, 1)

      const overIndex = overItems.indexOf(overId)
      const insertIndex = overIndex >= 0 ? overIndex : overItems.length

      overItems.splice(insertIndex, 0, activeId)

      return {
        ...current,
        [activeContainer]: activeItems,
        [overContainer]: overItems,
      }
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const activeId = String(active.id)
    const baseItems = dragColumnItems ?? derivedColumnItems
    const nextItems =
      over != null
        ? computeDragEndItems(baseItems, activeId, String(over.id))
        : baseItems

    setActiveCardId(null)
    setDragColumnItems(null)

    const mergedCards = mergeColumnItemsIntoCards(allCards, nextItems)
    onCardsChange(mergedCards)

    const finalColumn = findCardColumn(activeId, nextItems)
    const finalIndex = finalColumn
      ? nextItems[finalColumn].indexOf(activeId)
      : -1

    if (finalColumn && finalIndex >= 0) {
      onMoveCard?.(activeId, finalColumn, finalIndex)
    }
  }

  function handleDragCancel() {
    setActiveCardId(null)
    setDragColumnItems(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex w-full gap-3">
        {WORKSPACE_COLUMNS.map((column) => {
          const cardIds = columnItems[column.id]
          const columnCards = cardIds
            .map((torId) => cardsById[torId])
            .filter(Boolean)

          return (
            <SortableContext
              key={column.id}
              id={column.id}
              items={cardIds}
              strategy={verticalListSortingStrategy}
            >
              <KanbanColumn
                id={column.id}
                label={column.label}
                cards={columnCards}
                onOpenCardDetails={onOpenCardDetails}
              />
            </SortableContext>
          )
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {activeCard ? (
          <WorkspaceTorCard
            card={activeCard}
            className="cursor-grabbing shadow-lg ring-2 ring-[#0088C9]/20"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
