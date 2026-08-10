"use client"

import type { ReactNode } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Plus } from "lucide-react"

import { SortableWorkspaceTorCard } from "@/components/workspace/sortable-workspace-tor-card"
import { WorkspaceTorCard } from "@/components/workspace/workspace-tor-card"
import { Button } from "@/components/ui/button"
import { workspaceActions } from "@/lib/workspace-actions"
import { cn } from "@/lib/utils"
import type { WorkspaceCard, WorkspaceColumnId } from "@/types/workspace"

type KanbanColumnProps = {
  id: WorkspaceColumnId
  label: string
  cards: WorkspaceCard[]
  onOpenCardDetails?: (torId: string) => void
  onRequestAddTor?: (columnId: WorkspaceColumnId) => void
  disableDnd?: boolean
}

export function KanbanColumn({
  id,
  label,
  cards,
  onOpenCardDetails,
  onRequestAddTor,
  disableDnd = false,
}: KanbanColumnProps) {
  if (disableDnd) {
    return (
      <KanbanColumnShell
        id={id}
        label={label}
        count={cards.length}
        onRequestAddTor={onRequestAddTor}
      >
        <div className="flex min-h-[120px] flex-1 flex-col gap-2.5 overflow-y-auto rounded-lg pb-2">
          {cards.map((card) => (
            <WorkspaceTorCard
              key={card.torId}
              card={card}
              onOpenDetails={onOpenCardDetails}
            />
          ))}
        </div>
      </KanbanColumnShell>
    )
  }

  return (
    <DroppableKanbanColumn
      id={id}
      label={label}
      cards={cards}
      onOpenCardDetails={onOpenCardDetails}
      onRequestAddTor={onRequestAddTor}
    />
  )
}

function DroppableKanbanColumn({
  id,
  label,
  cards,
  onOpenCardDetails,
  onRequestAddTor,
}: Omit<KanbanColumnProps, "disableDnd">) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <KanbanColumnShell
      id={id}
      label={label}
      count={cards.length}
      onRequestAddTor={onRequestAddTor}
    >
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2.5 overflow-y-auto rounded-lg pb-2 transition-colors",
          isOver && "bg-accent"
        )}
      >
        {cards.map((card) => (
          <SortableWorkspaceTorCard
            key={card.torId}
            card={card}
            onOpenDetails={onOpenCardDetails}
          />
        ))}
      </div>
    </KanbanColumnShell>
  )
}

function KanbanColumnShell({
  id,
  label,
  count,
  children,
  onRequestAddTor,
}: {
  id: WorkspaceColumnId
  label: string
  count: number
  children: ReactNode
  onRequestAddTor?: (columnId: WorkspaceColumnId) => void
}) {
  function handleAdd() {
    if (onRequestAddTor) {
      onRequestAddTor(id)
      return
    }
    workspaceActions.addCardToColumn(id)
  }

  return (
    <section className="flex min-h-[520px] w-[24.25%] shrink-0 flex-col rounded-xl bg-secondary dark:!bg-black/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{label}</h2>
          <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {count}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 text-muted-foreground hover:text-foreground"
          aria-label={`Add TOR to ${label}`}
          onClick={handleAdd}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {children}

      <Button
        variant="ghost"
        className="mt-2 w-full justify-start gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={handleAdd}
      >
        <Plus className="size-4" />
        New
      </Button>
    </section>
  )
}
