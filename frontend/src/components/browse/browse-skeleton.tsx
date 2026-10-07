import { Skeleton } from "@/components/ui/skeleton"

/**
 * Stand-in for the browse page while its data loads. It reuses the real
 * page's shell (filter bar, list column, detail panel) so nothing shifts when
 * the content arrives.
 */

const LIST_CARDS = 6

/** The list column's cards alone, for when only the results are on their way. */
export function TorListSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="space-y-2 p-2"
    >
      {Array.from({ length: LIST_CARDS }, (_, index) => (
        <TorCardSkeleton key={index} />
      ))}
    </div>
  )
}

function FilterBarSkeleton() {
  return (
    <div className="border-b border-border bg-card px-4 py-3 md:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <Skeleton className="h-9 w-full min-w-0 xl:flex-1" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  )
}

function TorCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex h-6 items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="size-5" />
      </div>
      <div className="mt-2 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3.5 w-16" />
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-border bg-card p-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </div>
        </div>
        <Skeleton className="h-6 w-5/6" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2 rounded-lg border border-border p-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    </div>
  )
}

export function BrowseSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="flex min-h-0 flex-1 flex-col bg-muted"
    >
      <FilterBarSkeleton />
      <div className="grid min-h-0 flex-1 gap-3 p-3 md:grid-cols-[minmax(280px,360px)_1fr] md:p-4">
        <aside className="flex min-h-[320px] flex-col overflow-hidden rounded-xl border border-border bg-card md:max-h-[calc(100vh-12rem)] md:min-h-0">
          <TorListSkeleton />
        </aside>
        <section className="min-h-[480px] md:max-h-[calc(100vh-12rem)] md:min-h-0">
          <DetailSkeleton />
        </section>
      </div>
    </div>
  )
}
