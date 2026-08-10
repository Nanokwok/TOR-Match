"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { WorkspaceTorCard } from "@/components/workspace/workspace-tor-card"
import { cn } from "@/lib/utils"
import type { WorkspaceCard } from "@/types/workspace"

type SortableWorkspaceTorCardProps = {
  card: WorkspaceCard
  onOpenDetails?: (torId: string) => void
}

export function SortableWorkspaceTorCard({
  card,
  onOpenDetails,
}: SortableWorkspaceTorCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.torId })

  const wasDraggedRef = useRef(false)

  useEffect(() => {
    if (isDragging) wasDraggedRef.current = true
  }, [isDragging])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleOpenDetails(torId: string) {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false
      return
    }
    onOpenDetails?.(torId)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
      {...attributes}
      {...listeners}
    >
      <WorkspaceTorCard
        card={card}
        onOpenDetails={handleOpenDetails}
      />
    </div>
  )
}
