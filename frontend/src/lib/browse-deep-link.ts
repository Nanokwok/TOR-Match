import type { Tor } from "@/types/tor"

export type BrowseDeepLinkMeta = {
  requestedId: string
  found: boolean
  wasOutsideFilter: boolean
}

export type BrowseDeepLinkResult = {
  items: Tor[]
  selectedId: string | null
  deepLink: BrowseDeepLinkMeta | null
}

export function pinTorToFront(items: Tor[], tor: Tor): Tor[] {
  return [tor, ...items.filter((item) => item.id !== tor.id)]
}
