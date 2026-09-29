import "server-only"

import {
  pinTorToFront,
  type BrowseDeepLinkResult,
} from "@/lib/browse-deep-link"
import { getTorById } from "@/server/services/tor.service"
import type { Tor } from "@/types/tor"

export async function resolveBrowseDeepLink(
  torId: string | undefined,
  items: Tor[]
): Promise<BrowseDeepLinkResult> {
  const fallbackId = items[0]?.id ?? null
  const id = torId?.trim()
  if (!id) {
    return { items, selectedId: fallbackId, deepLink: null }
  }

  const inList = items.find((tor) => tor.id === id)
  if (inList) {
    return {
      items: pinTorToFront(items, inList),
      selectedId: inList.id,
      deepLink: {
        requestedId: id,
        found: true,
        wasOutsideFilter: false,
      },
    }
  }

  const fetched = await getTorById(id)
  if (!fetched) {
    return {
      items,
      selectedId: fallbackId,
      deepLink: {
        requestedId: id,
        found: false,
        wasOutsideFilter: false,
      },
    }
  }

  return {
    items: pinTorToFront(items, fetched),
    selectedId: fetched.id,
    deepLink: {
      requestedId: id,
      found: true,
      wasOutsideFilter: true,
    },
  }
}
