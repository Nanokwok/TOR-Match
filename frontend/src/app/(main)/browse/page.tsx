import { getCompanySetupProfileAction } from "@/actions/company-setup"
import { BrowseView } from "@/components/browse/browse-view"
import { resolveBrowseDeepLink } from "@/lib/browse-deep-link"
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
  const [{ items: listed }, departments, localOffices, companyProfile] =
    await Promise.all([
      listTors({ eligibleOnly: true }),
      listTorDepartments(),
      listTorLocalOffices(),
      getCompanySetupProfileAction(),
    ])

  const { items, selectedId } = await resolveBrowseDeepLink(params.tor, listed)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BrowseView
        initialItems={items}
        initialSelectedId={selectedId}
        departments={departments}
        localOffices={localOffices}
        companyProfile={companyProfile}
      />
    </div>
  )
}
