"use client"

import { useMemo, useState, useTransition } from "react"
import { Link2, X } from "lucide-react"

import { searchTorsAction } from "@/actions/tor"
import {
  filtersToQuery,
  TorFilterBar,
  type BrowseFiltersState,
} from "@/components/browse/tor-filter-bar"
import { TorDetail } from "@/components/browse/tor-detail"
import { TorList } from "@/components/browse/tor-list"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { browseActions } from "@/lib/browse-actions"
import { EMPTY_DETAIL_FILTERS } from "@/lib/browse-filters"
import {
  pinTorToFront,
  type BrowseDeepLinkMeta,
} from "@/lib/browse-deep-link"
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
  initialSelectedId: string | null
  initialDeepLink: BrowseDeepLinkMeta | null
  departments: LocalizedText[]
  localOffices: string[]
  companyProfile: CompanySetupProfile | null
}

export function BrowseView({
  initialItems,
  initialSelectedId,
  initialDeepLink,
  departments,
  localOffices,
  companyProfile,
}: BrowseViewProps) {
  const { t } = useLocale()
  const [filters, setFilters] = useState<BrowseFiltersState>(initialFilters)
  const [items, setItems] = useState(initialItems)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId)
  /** Keeps detail available when the current selection drops out of search results. */
  const [anchorTor, setAnchorTor] = useState<Tor | null>(
    () => initialItems.find((tor) => tor.id === initialSelectedId) ?? null
  )
  const [isPending, startTransition] = useTransition()
  const [notFoundDismissed, setNotFoundDismissed] = useState(false)
  const [ineligibleHintDismissed, setIneligibleHintDismissed] = useState(false)

  const linkedTorId =
    initialDeepLink?.found === true ? initialDeepLink.requestedId : null

  const selectedTor = useMemo(() => {
    const inList = items.find((item) => item.id === selectedId)
    if (inList) return inList
    if (anchorTor && anchorTor.id === selectedId) return anchorTor
    return null
  }, [items, selectedId, anchorTor])

  const selectionHiddenFromList = Boolean(
    selectedId && selectedTor && !items.some((item) => item.id === selectedId)
  )

  const showNotFoundBanner =
    initialDeepLink?.found === false && !notFoundDismissed

  const showIneligibleHint =
    Boolean(
      linkedTorId &&
        selectedTor?.id === linkedTorId &&
        selectedTor &&
        !selectedTor.eligible &&
        !ineligibleHintDismissed
    )

  function selectTor(id: string) {
    setSelectedId(id)
    const tor = items.find((item) => item.id === id) ?? anchorTor
    if (tor?.id === id) setAnchorTor(tor)
  }

  function runSearch(nextFilters: BrowseFiltersState) {
    startTransition(async () => {
      const previousSelected =
        items.find((item) => item.id === selectedId) ?? anchorTor
      const result = await searchTorsAction(filtersToQuery(nextFilters))
      setItems(result.items)

      if (
        selectedId &&
        result.items.some((item) => item.id === selectedId)
      ) {
        const stillThere = result.items.find((item) => item.id === selectedId)
        if (stillThere) setAnchorTor(stillThere)
        return
      }

      if (selectedId && previousSelected?.id === selectedId) {
        setAnchorTor(previousSelected)
        return
      }

      const nextId = result.items[0]?.id ?? null
      setSelectedId(nextId)
      setAnchorTor(result.items[0] ?? null)
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

  function handleShowEligibleAll() {
    const next = { ...filters, eligibleOnly: false }
    setFilters(next)
    setIneligibleHintDismissed(true)
    runSearch(next)
  }

  function handleShowSelectedInList() {
    if (!selectedTor) return
    setItems((prev) => pinTorToFront(prev, selectedTor))
    setAnchorTor(selectedTor)
  }

  function handleToggleBookmark(torId: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === torId ? { ...item, bookmarked: !item.bookmarked } : item
      )
    )
    setAnchorTor((prev) =>
      prev?.id === torId ? { ...prev, bookmarked: !prev.bookmarked } : prev
    )
    browseActions.bookmarkTor(torId)
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

      {showNotFoundBanner ? (
        <BrowseNotice
          message={t("browse.deepLink.notFound")}
          onDismiss={() => setNotFoundDismissed(true)}
        />
      ) : null}

      {showIneligibleHint ? (
        <BrowseNotice
          message={t("browse.deepLink.ineligibleHint")}
          actionLabel={t("browse.deepLink.showAllEligible")}
          onAction={handleShowEligibleAll}
          onDismiss={() => setIneligibleHintDismissed(true)}
        />
      ) : null}

      {selectionHiddenFromList ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2 md:px-6">
          <span className="text-sm text-muted-foreground">
            {t("browse.deepLink.hiddenFromResults")}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7"
            onClick={handleShowSelectedInList}
          >
            {t("browse.deepLink.showSelectedInList")}
          </Button>
        </div>
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
            linkedTorId={linkedTorId}
            onSelect={selectTor}
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

function BrowseNotice({
  message,
  actionLabel,
  onAction,
  onDismiss,
}: {
  message: string
  actionLabel?: string
  onAction?: () => void
  onDismiss: () => void
}) {
  const { t } = useLocale()

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 border-b border-[#0088C9]/20 bg-[#0088C9]/5 px-4 py-2 text-sm text-foreground md:px-6"
    >
      <Link2 className="size-4 shrink-0 text-[#0088C9]" aria-hidden />
      <p className="min-w-0 flex-1">{message}</p>
      {actionLabel && onAction ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="size-7 text-muted-foreground"
        aria-label={t("common.close")}
        onClick={onDismiss}
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}
