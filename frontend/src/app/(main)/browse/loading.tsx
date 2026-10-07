import { BrowseSkeleton } from "@/components/browse/browse-skeleton"

export default function BrowseLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BrowseSkeleton />
    </div>
  )
}
