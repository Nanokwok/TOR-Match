import { BrowseView } from "@/components/browse/browse-view"
import {
  listTorDepartments,
  listTorLocalOffices,
  listTors,
} from "@/server/services/tor.service"

export default async function BrowsePage() {
  const [{ items }, departments, localOffices] = await Promise.all([
    listTors({ eligibleOnly: true }),
    listTorDepartments(),
    listTorLocalOffices(),
  ])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BrowseView
        initialItems={items}
        departments={departments}
        localOffices={localOffices}
      />
    </div>
  )
}
