"use client"

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react"
import { ChevronLeft, ChevronRight, Link2, X } from "lucide-react"

import { searchTorsAction } from "@/actions/tor"
import { bookmarkTorAction } from "@/actions/workspace"
import {
  filtersToQuery,
  TorFilterBar,
  type BrowseFiltersState,
} from "@/components/browse/tor-filter-bar"
import { TorListSkeleton } from "@/components/browse/browse-skeleton"
import { TorDetail } from "@/components/browse/tor-detail"
import { TorList } from "@/components/browse/tor-list"
import { useLocale } from "@/components/i18n/locale-provider"
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
  BROWSE_PAGE_SIZE,
  DEFAULT_BROWSE_SORT,
  EMPTY_DETAIL_FILTERS,
} from "@/lib/browse-filters"
import {
  getStoredBrowseFiltersSnapshot,
  writeStoredBrowseFilters,
} from "@/lib/browse-filter-storage"
import { getTorStage } from "@/lib/deadline"
import { BROWSE_OPEN_ONLY_COOKIE, writePreferenceCookie } from "@/lib/preferences"
import {
  pinTorToFront,
  type BrowseDeepLinkMeta,
} from "@/lib/browse-deep-link"
import type { LocalizedText } from "@/types/localized"
import type { Tor } from "@/types/tor"

const initialFilters: BrowseFiltersState = {
  keyword: "",
  openOnly: true,
  sort: DEFAULT_BROWSE_SORT,
  budgetRange: "all",
  status: "all",
  department: "all",
  detail: { ...EMPTY_DETAIL_FILTERS },
}

type BrowseViewProps = {
  initialItems: Tor[]
  initialSelectedId: string | null
  initialDeepLink: BrowseDeepLinkMeta | null
  initialOpenOnly: boolean
  initialTotal: number
  initialTotalPages: number
  departments: LocalizedText[]
  localOffices: string[]
}

export function BrowseView({
  initialItems,
  initialSelectedId,
  initialDeepLink,
  initialOpenOnly,
  initialTotal,
  initialTotalPages,
  departments,
  localOffices,
}: BrowseViewProps) {
  const { t } = useLocale()
  // The filters on screen are what the user last set, or until they touch
  // anything, the defaults with whatever was saved in localStorage laid over
  // them. Reading storage through useSyncExternalStore lets the filter bar show
  // the saved values on the first client render — the server has no storage, so
  // it renders the defaults and hydration stays consistent.
  const stored = useSyncExternalStore(
    () => () => {},
    getStoredBrowseFiltersSnapshot,
    () => null
  )
  const defaultFilters = { ...initialFilters, openOnly: initialOpenOnly }
  const [edited, setEdited] = useState<BrowseFiltersState | null>(null)
  const filters: BrowseFiltersState =
    edited ?? (stored ? { ...defaultFilters, ...stored } : defaultFilters)
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(initialTotal)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId)
  /** Keeps detail available when the current selection drops out of search results. */
  const [anchorTor, setAnchorTor] = useState<Tor | null>(
    () => initialItems.find((tor) => tor.id === initialSelectedId) ?? null
  )
  const [isPending, startTransition] = useTransition()
  const [notFoundDismissed, setNotFoundDismissed] = useState(false)
  const [closedHintDismissed, setClosedHintDismissed] = useState(false)
  const [bookmarkError, setBookmarkError] = useState<string | null>(null)
  const [isDetailDirty, setIsDetailDirty] = useState(false)
  const [pendingTorId, setPendingTorId] = useState<string | null>(null)
  const [showSwitchTorModal, setShowSwitchTorModal] = useState(false)

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

  const showClosedHint = Boolean(
    linkedTorId &&
      selectedTor?.id === linkedTorId &&
      selectedTor &&
      getTorStage(selectedTor) !== "open" &&
      !closedHintDismissed
  )

  function doSelectTor(id: string) {
    setSelectedId(id)
    const tor = items.find((item) => item.id === id) ?? anchorTor
    if (tor?.id === id) setAnchorTor(tor)
  }

  function selectTor(id: string) {
    if (id === selectedId) return
    if (isDetailDirty) {
      setPendingTorId(id)
      setShowSwitchTorModal(true)
      return
    }
    doSelectTor(id)
  }

  function handleConfirmSwitchTor() {
    setShowSwitchTorModal(false)
    setIsDetailDirty(false)
    if (pendingTorId) {
      doSelectTor(pendingTorId)
      setPendingTorId(null)
    }
  }

  function runSearch(nextFilters: BrowseFiltersState, targetPage = 1) {
    startTransition(async () => {
      // In the same transition as the results, so the filter bar and the list
      // switch together — which also matters when saved filters are restored.
      setEdited(nextFilters)
      const previousSelected =
        items.find((item) => item.id === selectedId) ?? anchorTor
      const result = await searchTorsAction({
        ...filtersToQuery(nextFilters),
        page: targetPage,
        pageSize: BROWSE_PAGE_SIZE,
      })
      setItems(result.items)
      // The server clamps a page past the end, so trust what it answered.
      setPage(result.page ?? 1)
      setTotal(result.total)
      setTotalPages(result.totalPages ?? 1)

      if (selectedId && result.items.some((item) => item.id === selectedId)) {
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

  function goToPage(targetPage: number) {
    runSearch(filters, targetPage)
  }

  // The server's first page uses the defaults, so when saved filters differ the
  // list is fetched again for them — once. `stored` is null while hydrating and
  // only becomes the saved value on the render after, hence the dependency.
  const restoredOnce = useRef(false)
  // A layout effect, so the skeleton replaces the default page before it is painted.
  useLayoutEffect(() => {
    if (restoredOnce.current || !stored) return
    restoredOnce.current = true
    const restored = { ...defaultFilters, ...stored }
    if (JSON.stringify(restored) === JSON.stringify(defaultFilters)) return
    runSearch(restored)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the saved value arrives
  }, [stored])

  function handleFiltersChange(next: BrowseFiltersState) {
    const detailChanged =
      JSON.stringify(next.detail) !== JSON.stringify(filters.detail)
    // A switch or a sort reads as instant; waiting for Enter in the search box
    // made turning it off look like it did nothing.
    const openOnlyChanged = next.openOnly !== filters.openOnly
    const instantChanged = openOnlyChanged || next.sort !== filters.sort
    // Remembered for the next visit. Only the switch itself writes the cookie:
    // the "turn off Open only" shortcut on a linked TOR is a one-off, not a choice.
    if (openOnlyChanged) {
      writePreferenceCookie(BROWSE_OPEN_ONLY_COOKIE, String(next.openOnly))
    }
    writeStoredBrowseFilters(next)
    setEdited(next)
    if (detailChanged || instantChanged) {
      runSearch(next)
    }
  }

  function handleShowAllTors() {
    const next = { ...filters, openOnly: false }
    setEdited(next)
    setClosedHintDismissed(true)
    runSearch(next)
  }

  function handleShowSelectedInList() {
    if (!selectedTor) return
    setItems((prev) => pinTorToFront(prev, selectedTor))
    setAnchorTor(selectedTor)
  }

  function setBookmarked(torId: string, bookmarked: boolean) {
    setItems((prev) =>
      prev.map((item) => (item.id === torId ? { ...item, bookmarked } : item))
    )
    setAnchorTor((prev) =>
      prev?.id === torId ? { ...prev, bookmarked } : prev
    )
  }

  function handleToggleBookmark(torId: string) {
    const current =
      items.find((item) => item.id === torId) ??
      (anchorTor?.id === torId ? anchorTor : null)
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

      {showNotFoundBanner ? (
        <BrowseNotice
          message={t("browse.deepLink.notFound")}
          onDismiss={() => setNotFoundDismissed(true)}
        />
      ) : null}

      {showClosedHint ? (
        <BrowseNotice
          message={t("browse.deepLink.closedHint")}
          actionLabel={t("browse.deepLink.showAllTors")}
          onAction={handleShowAllTors}
          onDismiss={() => setClosedHintDismissed(true)}
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

      {bookmarkError ? (
        <p
          role="alert"
          className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive md:px-6"
        >
          {bookmarkError}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 p-3 md:grid-cols-[minmax(280px,360px)_1fr] md:p-4">
        <aside className="min-h-[320px] rounded-xl border border-border bg-card md:min-h-0 md:max-h-[calc(100vh-12rem)] overflow-hidden flex flex-col">
          {isPending ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              <TorListSkeleton />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <TorList
                items={items}
                selectedId={selectedId}
                linkedTorId={linkedTorId}
                onSelect={selectTor}
                onToggleBookmark={handleToggleBookmark}
              />
            </div>
          )}
          <BrowsePager
            page={page}
            totalPages={totalPages}
            total={total}
            disabled={isPending}
            onPageChange={goToPage}
          />
        </aside>

        <section className="min-h-[480px] md:min-h-0 md:max-h-[calc(100vh-12rem)]">
          <TorDetail
            tor={selectedTor}
            onToggleBookmark={handleToggleBookmark}
            onDirtyChange={setIsDetailDirty}
          />
        </section>
      </div>

      <Dialog open={showSwitchTorModal} onOpenChange={setShowSwitchTorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("browse.qualificationPanel.discardChangesTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("browse.qualificationPanel.discardChangesDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowSwitchTorModal(false)
                setPendingTorId(null)
              }}
            >
              {t("browse.qualificationPanel.keepEditing")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmSwitchTor}
            >
              {t("browse.qualificationPanel.discardAndExit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BrowsePager({
  page,
  totalPages,
  total,
  disabled,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  disabled: boolean
  onPageChange: (page: number) => void
}) {
  const { t } = useLocale()
  if (total === 0) return null

  return (
    <nav
      aria-label={t("browse.pagination.label")}
      className="flex items-center justify-between gap-2 border-t border-border px-3 py-2"
    >
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        disabled={disabled || page <= 1}
        aria-label={t("browse.pagination.previous")}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <p className="text-center text-xs text-muted-foreground" aria-live="polite">
        {t("browse.pagination.status", { page, totalPages, total })}
      </p>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        disabled={disabled || page >= totalPages}
        aria-label={t("browse.pagination.next")}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
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
