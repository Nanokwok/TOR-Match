"use client"

import { useMemo, useState, useTransition } from "react"

import { searchTorsAction } from "@/actions/tor"
import { bookmarkTorAction } from "@/actions/workspace"
import {
  filtersToQuery,
  TorFilterBar,
  type BrowseFiltersState,
} from "@/components/browse/tor-filter-bar"
import { TorDetail } from "@/components/browse/tor-detail"
import { TorList } from "@/components/browse/tor-list"
import { EMPTY_DETAIL_FILTERS } from "@/lib/browse-filters"
import type { CompanySetupProfile } from "@/types/company-setup"
import type { LocalizedText } from "@/types/localized"
import type { Tor } from "@/types/tor"

const initialFilters: BrowseFiltersState = {
  keyword: "",
  eligibleOnly: true,
  budgetRange: "all",
  status: "all",
  department: "all",
  detail: { ...EMPTY_DETAIL_FILTERS },
}

type BrowseViewProps = {
  initialItems: Tor[]
  departments: LocalizedText[]
  localOffices: string[]
  companyProfile: CompanySetupProfile | null
}

export function BrowseView({
  initialItems,
  departments,
  localOffices,
  companyProfile,
}: BrowseViewProps) {
  const [filters, setFilters] = useState<BrowseFiltersState>(initialFilters)
  const [items, setItems] = useState(initialItems)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialItems[0]?.id ?? null
  )
  const [isPending, startTransition] = useTransition()
  const [bookmarkError, setBookmarkError] = useState<string | null>(null)

  const selectedTor = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  )

  function runSearch(nextFilters: BrowseFiltersState) {
    startTransition(async () => {
      const result = await searchTorsAction(filtersToQuery(nextFilters))
      setItems(result.items)
      setSelectedId((current) => {
        if (current && result.items.some((item) => item.id === current)) {
          return current
        }
        return result.items[0]?.id ?? null
      })
    })
  }

  function handleSearch() {
    runSearch(filters)
  }

  function handleFiltersChange(next: BrowseFiltersState) {
    const detailChanged =
      JSON.stringify(next.detail) !== JSON.stringify(filters.detail)
    setFilters(next)
    if (detailChanged) {
      runSearch(next)
    }
  }

  function setBookmarked(torId: string, bookmarked: boolean) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === torId ? { ...item, bookmarked } : item
      )
    )
  }

  function handleToggleBookmark(torId: string) {
    const current = items.find((item) => item.id === torId)
    if (!current) return

    const next = !current.bookmarked
    setBookmarkError(null)
    setBookmarked(torId, next)

    void bookmarkTorAction(torId, next).then((result) => {
      if (result.ok) return
      setBookmarked(torId, current.bookmarked)
      setBookmarkError(result.error)
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted">
      <TorFilterBar
        filters={filters}
        departments={departments}
        localOffices={localOffices}
        onChange={handleFiltersChange}
        onSearch={handleSearch}
      />

      {bookmarkError ? (
        <p
          role="alert"
          className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive md:px-6"
        >
          {bookmarkError}
        </p>
      ) : null}

      <div
        className={`grid min-h-0 flex-1 gap-3 p-3 md:grid-cols-[minmax(280px,360px)_1fr] md:p-4 ${
          isPending ? "opacity-70" : ""
        }`}
      >
        <aside className="min-h-[320px] overflow-y-auto rounded-xl border border-border bg-card md:min-h-0 md:max-h-[calc(100vh-12rem)]">
          <TorList
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggleBookmark={handleToggleBookmark}
          />
        </aside>

        <section className="min-h-[480px] md:min-h-0 md:max-h-[calc(100vh-12rem)]">
          <TorDetail
            tor={selectedTor}
            companyProfile={companyProfile}
            onToggleBookmark={handleToggleBookmark}
          />
        </section>
      </div>
    </div>
  )
}
