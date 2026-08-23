"use client"

import { useState } from "react"
import {
  Banknote,
  Clock3,
  MoreVertical,
  Users,
} from "lucide-react"

import { useLocale } from "@/components/i18n/locale-provider"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDaysLeft, formatThb } from "@/lib/format"
import { pickLocalized } from "@/lib/localized-content"
import { workspaceActions } from "@/lib/workspace-actions"
import { cn } from "@/lib/utils"
import type { TorPriority } from "@/types/tor"
import type { WorkspaceCard } from "@/types/workspace"

const priorityStyles: Record<
  TorPriority,
  { badge: string; labelKey: string }
> = {
  HIGH: {
    badge:
      "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-950",
    labelKey: "common.high",
  },
  MEDIUM: {
    badge:
      "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-950",
    labelKey: "common.medium",
  },
  LOW: {
    badge:
      "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-950",
    labelKey: "common.low",
  },
}

type WorkspaceTorCardProps = {
  card: WorkspaceCard
  className?: string
  onOpenDetails?: (torId: string) => void
  onDelete?: (torId: string) => void
}

export function WorkspaceTorCard({
  card,
  className,
  onOpenDetails,
  onDelete,
}: WorkspaceTorCardProps) {
  const { locale, t } = useLocale()
  const priority = priorityStyles[card.priority]
  const [confirmOpen, setConfirmOpen] = useState(false)
  const title = pickLocalized(card.title, card.titleTh, locale)
  const daysLeftLabels = {
    dueToday: t("workspace.dueToday"),
    oneDayLeft: t("workspace.oneDayLeft"),
    daysLeft: t("workspace.daysLeft"),
  }

  function handleConfirmDelete() {
    onDelete?.(card.torId)
    setConfirmOpen(false)
  }

  return (
    <>
      <article
        className={cn(
          "rounded-xl border border-border bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md",
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
            <Badge className={priority.badge}>{t(priority.labelKey)}</Badge>
            <span className="truncate text-xs text-muted-foreground">
              {card.announcementNo}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
              aria-label={t("workspace.cardOptions")}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onClick={() => onOpenDetails?.(card.torId)}>
                {t("workspace.viewEditDetails")}
              </DropdownMenuItem>
              {onDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(event) => {
                      event.stopPropagation()
                      setConfirmOpen(true)
                    }}
                  >
                    {t("workspace.deleteCard")}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="mt-2.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {title}
        </h3>

        <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Banknote className="size-3.5 shrink-0 text-primary" />
            <span>{formatThb(card.budgetBaht, locale)}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Clock3 className="size-3.5 shrink-0 text-primary" />
            <span>{formatDaysLeft(card.deadline, locale, daysLeftLabels)}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Users className="size-3.5 shrink-0 text-primary" />
            <span>{card.assigneeIds.length}</span>
          </p>
        </div>

        <div className="mt-3 flex justify-end">
          <Button
            variant="link"
            className="h-auto p-0 text-xs text-primary"
            onClick={(event) => {
              event.stopPropagation()
              workspaceActions.seeFullTor(card.torId)
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {t("workspace.seeFullTor")}
          </Button>
        </div>
      </article>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="sm:max-w-md"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{t("workspace.deleteCardTitle")}</DialogTitle>
            <DialogDescription>
              {t("workspace.deleteCardDesc", { title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
