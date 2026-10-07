/**
 * Where a TOR came from. Stored on the TOR so the page can say so, and so a
 * future second feed has somewhere to put its name.
 *
 *   egp-rss  the Comptroller General's e-GP RSS feed, read by the ingest
 *   seed     the sample fixtures loaded by `npm run seed`
 */
export const TOR_SOURCES = ["egp-rss", "seed"] as const
export type TorSource = (typeof TOR_SOURCES)[number]

/** Every seeded fixture points at the portal's front page rather than a real announcement. */
const SEED_SOURCE_URL = "https://www.gprocurement.go.th"

/**
 * The source of a stored TOR. TORs ingested before the field existed have
 * none, and are told apart by the one thing the fixtures do differently: a
 * bare portal URL. Anything else came through the feed.
 */
export function resolveTorSource(tor: { source?: string | null; sourceUrl?: string | null }): TorSource {
  if (tor.source && (TOR_SOURCES as readonly string[]).includes(tor.source)) return tor.source as TorSource
  return tor.sourceUrl?.replace(/\/$/, "") === SEED_SOURCE_URL ? "seed" : "egp-rss"
}
