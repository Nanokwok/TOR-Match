import { BrowseView } from "@/components/browse/browse-view"
import { BROWSE_PAGE_SIZE, DEFAULT_BROWSE_SORT } from "@/lib/browse-filters"
import { resolveBrowseDeepLink } from "@/lib/browse-deep-link.server"
import {
  listTorDepartments,
  listTorLocalOffices,
  listTors,
} from "@/server/services/tor.service"

type BrowsePageProps = {
  searchParams: Promise<{ tor?: string }>
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams
  const [listing, departments, localOffices] = await Promise.all([
    listTors({
      openOnly: true,
      sort: DEFAULT_BROWSE_SORT,
      page: 1,
      pageSize: BROWSE_PAGE_SIZE,
    }),
    listTorDepartments(),
    listTorLocalOffices(),
  ])

  const { items, selectedId, deepLink } = await resolveBrowseDeepLink(
    params.tor,
    listing.items
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BrowseView
        initialItems={items}
        initialSelectedId={selectedId}
        initialDeepLink={deepLink}
        initialTotal={listing.total}
        initialTotalPages={listing.totalPages ?? 1}
        departments={departments}
        localOffices={localOffices}
      />
    </div>
  )
}
