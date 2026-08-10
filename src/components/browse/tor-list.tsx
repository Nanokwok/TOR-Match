"use client"

import { Bookmark } from "lucide-react"

import { formatBaht } from "@/lib/format"
import { browseActions } from "@/lib/browse-actions"
import { cn } from "@/lib/utils"
import type { Tor } from "@/types/tor"

type TorListProps = {
  items: Tor[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function TorList({ items, selectedId, onSelect }: TorListProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        No TORs match your filters.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {items.map((tor) => {
        const selected = tor.id === selectedId

        return (
          <button
            key={tor.id}
            type="button"
            onClick={() => onSelect(tor.id)}
            className={cn(
              "w-full rounded-lg border bg-white p-3 text-left transition-colors",
              selected
                ? "border-[#0088C9] bg-[#EBF8FF] ring-1 ring-[#0088C9]/30"
                : "border-border hover:bg-muted/40"
            )}
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-sm font-semibold text-neutral-950">
                  {tor.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tor.department}
                </p>
              </div>
              <button
                type="button"
                className="mt-0.5 shrink-0 rounded-sm p-0.5 hover:bg-black/5"
                aria-label="Bookmark TOR"
                onClick={(event) => {
                  event.stopPropagation()
                  browseActions.bookmarkTor(tor.id)
                }}
              >
                <Bookmark
                  className={cn(
                    "size-4",
                    tor.bookmarked
                      ? "fill-[#0088C9] text-[#0088C9]"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            </div>

            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {tor.listTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <span className="shrink-0 text-xs font-medium text-neutral-950">
                {formatBaht(tor.budgetBaht)}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
