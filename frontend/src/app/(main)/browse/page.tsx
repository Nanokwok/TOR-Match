import { cookies } from "next/headers"

import { BrowseView } from "@/components/browse/browse-view"
import { BROWSE_PAGE_SIZE, DEFAULT_BROWSE_SORT } from "@/lib/browse-filters"
import { resolveBrowseDeepLink } from "@/lib/browse-deep-link.server"
import { BROWSE_OPEN_ONLY_COOKIE, parseBrowseOpenOnly } from "@/lib/preferences"
import { getUserSession } from "@/lib/user-session"
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
  // Anyone may browse; what depends on a signed-in user (eligibility, bookmarks) is hidden from a guest.
  const isSignedIn = (await getUserSession()) !== null
  const openOnly = parseBrowseOpenOnly(
    (await cookies()).get(BROWSE_OPEN_ONLY_COOKIE)?.value
  )
  const [listing, departments, localOffices] = await Promise.all([
    listTors({
      openOnly,
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
    <div className="flex min-h-0 flex-1 flex-col w-full min-w-0">
      <BrowseView
        isSignedIn={isSignedIn}
        initialItems={items}
        initialSelectedId={selectedId}
        initialDeepLink={deepLink}
        initialOpenOnly={openOnly}
        initialTotal={listing.total}
        initialTotalPages={listing.totalPages ?? 1}
        departments={departments}
        localOffices={localOffices}
      />
    </div>
  )
}
