"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Search } from "lucide-react"

import {
  addTorToWorkspaceAction,
  searchTorsForWorkspaceAction,
} from "@/actions/workspace"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatThb } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Tor } from "@/types/tor"
import type { WorkspaceCard, WorkspaceColumnId } from "@/types/workspace"
import { WORKSPACE_COLUMNS } from "@/types/workspace"

type AddTorToColumnDialogProps = {
  open: boolean
  columnId: WorkspaceColumnId | null
  existingTorIds: string[]
  onOpenChange: (open: boolean) => void
  onAdded: (card: WorkspaceCard, cards: WorkspaceCard[]) => void
}

export function AddTorToColumnDialog({
  open,
  columnId,
  existingTorIds,
  onOpenChange,
  onAdded,
}: AddTorToColumnDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && columnId ? (
        <AddTorToColumnDialogBody
          key={columnId}
          columnId={columnId}
          existingTorIds={existingTorIds}
          onOpenChange={onOpenChange}
          onAdded={onAdded}
        />
      ) : null}
    </Dialog>
  )
}

type AddTorToColumnDialogBodyProps = {
  columnId: WorkspaceColumnId
  existingTorIds: string[]
  onOpenChange: (open: boolean) => void
  onAdded: (card: WorkspaceCard, cards: WorkspaceCard[]) => void
}

function AddTorToColumnDialogBody({
  columnId,
  existingTorIds,
  onOpenChange,
  onAdded,
}: AddTorToColumnDialogBodyProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Tor[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSearching, startSearch] = useTransition()
  const [isAdding, startAdd] = useTransition()

  const columnLabel =
    WORKSPACE_COLUMNS.find((column) => column.id === columnId)?.label ??
    "column"

  const existingSet = useMemo(
    () => new Set(existingTorIds),
    [existingTorIds]
  )

  useEffect(() => {
    let cancelled = false
    const handle = window.setTimeout(() => {
      startSearch(async () => {
        const items = await searchTorsForWorkspaceAction(query)
        if (!cancelled) setResults(items)
      })
    }, query ? 180 : 0)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [query])

  function handleAdd(tor: Tor) {
    if (isAdding) return

    setError(null)
    startAdd(async () => {
      const result = await addTorToWorkspaceAction(tor.id, columnId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onAdded(result.card, result.cards)
      onOpenChange(false)
    })
  }

  return (
    <DialogContent
      className="gap-0 overflow-hidden p-0 sm:max-w-lg"
      showCloseButton
    >
      <DialogHeader className="border-b border-border px-5 py-4">
        <DialogTitle>Add TOR to {columnLabel}</DialogTitle>
        <DialogDescription>
          Search by TOR name or ID, then select one to add.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 px-5 py-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search TOR name or ID..."
            className="h-10 pl-9"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border">
          {results.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              {isSearching ? "Searching..." : "No TORs found"}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((tor) => {
                const alreadyAdded = existingSet.has(tor.id)

                return (
                  <li key={tor.id}>
                    <button
                      type="button"
                      disabled={isAdding}
                      onClick={() => handleAdd(tor)}
                      className={cn(
                        "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                        alreadyAdded && "bg-slate-50/80"
                      )}
                    >
                      <span className="line-clamp-1 text-sm font-medium text-neutral-950">
                        {tor.title}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{tor.id}</span>
                        <span aria-hidden>•</span>
                        <span>{tor.announcementNo}</span>
                        <span aria-hidden>•</span>
                        <span>{formatThb(tor.budgetBaht)}</span>
                        {alreadyAdded ? (
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
                            On board
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-border px-5 py-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
      </div>
    </DialogContent>
  )
}
