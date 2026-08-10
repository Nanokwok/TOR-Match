"use client"

import {
  Banknote,
  Clock3,
  MoreVertical,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDaysLeft, formatThb } from "@/lib/format"
import { workspaceActions } from "@/lib/workspace-actions"
import { cn } from "@/lib/utils"
import type { TorPriority } from "@/types/tor"
import type { WorkspaceCard } from "@/types/workspace"

const priorityStyles: Record<
  TorPriority,
  { badge: string; label: string }
> = {
  HIGH: {
    badge: "bg-red-100 text-red-700 hover:bg-red-100",
    label: "HIGH",
  },
  MEDIUM: {
    badge: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    label: "MEDIUM",
  },
  LOW: {
    badge: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    label: "LOW",
  },
}

type WorkspaceTorCardProps = {
  card: WorkspaceCard
  className?: string
  onOpenDetails?: (torId: string) => void
}

export function WorkspaceTorCard({
  card,
  className,
  onOpenDetails,
}: WorkspaceTorCardProps) {
  const priority = priorityStyles[card.priority]

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md",
        onOpenDetails && "cursor-pointer",
        className
      )}
      onClick={() => onOpenDetails?.(card.torId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpenDetails?.(card.torId)
        }
      }}
      role={onOpenDetails ? "button" : undefined}
      tabIndex={onOpenDetails ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge className={priority.badge}>{priority.label}</Badge>
          <span className="truncate text-xs text-muted-foreground">
            {card.announcementNo}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-neutral-950"
            aria-label="Card options"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem
              onClick={() => onOpenDetails?.(card.torId)}
            >
              View/Edit Full Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="mt-2.5 line-clamp-2 text-sm font-semibold leading-snug text-neutral-950">
        {card.title}
      </h3>

      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Banknote className="size-3.5 shrink-0 text-[#0088C9]" />
          <span>{formatThb(card.budgetBaht)}</span>
        </p>
        <p className="flex items-center gap-1.5">
          <Clock3 className="size-3.5 shrink-0 text-[#0088C9]" />
          <span>{formatDaysLeft(card.deadline)}</span>
        </p>
        <p className="flex items-center gap-1.5">
          <Users className="size-3.5 shrink-0 text-[#0088C9]" />
          <span>{card.assigneeIds.length}</span>
        </p>
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          variant="link"
          className="h-auto p-0 text-xs text-[#0088C9]"
          onClick={(event) => {
            event.stopPropagation()
            workspaceActions.seeFullTor(card.torId)
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          See full TOR →
        </Button>
      </div>
    </article>
  )
}
