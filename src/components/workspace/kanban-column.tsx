"use client"

import { useDroppable } from "@dnd-kit/core"
import { Plus } from "lucide-react"

import { SortableWorkspaceTorCard } from "@/components/workspace/sortable-workspace-tor-card"
import { Button } from "@/components/ui/button"
import { workspaceActions } from "@/lib/workspace-actions"
import { cn } from "@/lib/utils"
import type { WorkspaceCard, WorkspaceColumnId } from "@/types/workspace"

type KanbanColumnProps = {
  id: WorkspaceColumnId
  label: string
  cards: WorkspaceCard[]
  onOpenCardDetails?: (torId: string) => void
}

export function KanbanColumn({
  id,
  label,
  cards,
  onOpenCardDetails,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <section className="flex min-h-[520px] w-[24.25%] shrink-0 flex-col rounded-xl bg-[#ECECEF] p-3">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-neutral-950">{label}</h2>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {cards.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 text-muted-foreground hover:text-neutral-950"
          aria-label={`Add to ${label}`}
          onClick={() => workspaceActions.addToColumnHeader(id)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2.5 overflow-y-auto rounded-lg pb-2 transition-colors",
          isOver && "bg-[#E4E4E8]"
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

      <Button
        variant="ghost"
        className="mt-2 w-full justify-start gap-1.5 text-muted-foreground hover:text-neutral-950"
        onClick={() => workspaceActions.addCardToColumn(id)}
      >
        <Plus className="size-4" />
        New
      </Button>
    </section>
  )
}
