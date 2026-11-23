import { env } from "@/config/env"
import { Tor, type TorDoc } from "@/models/Tor.model"
import { createListCache } from "@/utils/list-cache"

/**
 * Every published TOR, newest stored first, kept in memory.
 *
 * The browse page asks for ten TORs but has to look at all of them (eligibility
 * and the detail filters are decided per TOR in this process), so each request
 * used to download the whole collection: 7 MB over the network to the database,
 * 15 to 50 seconds on a slow link, to compute something that takes 50 ms. The
 * collection changes when a reviewer publishes or the scraper runs, so a minute
 * of staleness costs nothing a bidder would notice.
 *
 * Refreshed in the background once it is older than TOR_CACHE_TTL_MS, so only
 * the first request after a start (or a long idle) waits. TOR_CACHE_TTL_MS=0
 * turns it off. The scraper and the deadline job run in other processes and
 * cannot clear this one; the TTL is what bounds how late their changes show.
 */
export const torListCache = createListCache<TorDoc>({
  ttlMs: env.torCacheTtlMs,
  load: () => Tor.find({}).sort({ createdAt: -1 }),
  onRefreshError: (error) => {
    console.warn("[tor-cache] background refresh failed, serving the previous list:", error instanceof Error ? error.message : error)
  },
})
