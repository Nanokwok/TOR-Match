import { getCompanySetupProfileAction } from "@/actions/company-setup"
import { BrowseView } from "@/components/browse/browse-view"
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
  const [{ items }, departments, localOffices, companyProfile] =
    await Promise.all([
      listTors({ eligibleOnly: true }),
      listTorDepartments(),
      listTorLocalOffices(),
      getCompanySetupProfileAction(),
    ])

  const torId = params.tor?.trim()
  const initialSelectedId =
    torId && items.some((tor) => tor.id === torId)
      ? torId
      : (items[0]?.id ?? null)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BrowseView
        initialItems={items}
        initialSelectedId={initialSelectedId}
        departments={departments}
        localOffices={localOffices}
        companyProfile={companyProfile}
      />
    </div>
  )
}
