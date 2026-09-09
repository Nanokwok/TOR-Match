import { getTorById } from "@/server/services/tor.service"
import type { Tor } from "@/types/tor"

export type BrowseDeepLinkResult = {
  items: Tor[]
  selectedId: string | null
}

export async function resolveBrowseDeepLink(
  torId: string | undefined,
  items: Tor[]
): Promise<BrowseDeepLinkResult> {
  const fallbackId = items[0]?.id ?? null
  const id = torId?.trim()
  if (!id) {
    return { items, selectedId: fallbackId }
  }

  if (items.some((tor) => tor.id === id)) {
    return { items, selectedId: id }
  }

  const fetched = await getTorById(id)
  if (!fetched) {
    return { items, selectedId: fallbackId }
  }

  return {
    items: [fetched, ...items.filter((tor) => tor.id !== fetched.id)],
    selectedId: fetched.id,
  }
}
