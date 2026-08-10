import { BrowseView } from "@/components/browse/browse-view"
import { listTorDepartments, listTors } from "@/server/services/tor.service"

export default async function BrowsePage() {
  const [{ items }, departments] = await Promise.all([
    listTors({ eligibleOnly: true }),
    listTorDepartments(),
  ])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BrowseView initialItems={items} departments={departments} />
    </div>
  )
}

