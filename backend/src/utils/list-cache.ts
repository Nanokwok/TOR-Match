export type ListCacheOptions<T> = {
  /** How long a loaded list counts as fresh. 0 or less turns the cache off: every `get` loads. */
  ttlMs: number
  load: () => Promise<readonly T[]>
  /**
   * Past this age a list is no longer served at all and the caller waits for a
   * fresh one. Between `ttlMs` and this, the old list is served while a new one
   * loads in the background, so nobody waits for a refresh except after a long idle.
   */
  maxStaleMs?: number
  now?: () => number
  onRefreshError?: (error: unknown) => void
}

export type ListCache<T> = {
  get(): Promise<readonly T[]>
  /** Forget the list now: the next `get` waits for a fresh one. */
  invalidate(): void
}

/**
 * Keeps one loaded list in memory.
 *
 * Built for data that is read on every request, changes rarely, and costs a
 * slow round trip to load (the published TORs: a few megabytes from a remote
 * database). Callers receive the same array each time and must not change it.
 *
 * Concurrent loads are joined into one, and a load that began before an
 * `invalidate` is not stored, so a change made while it was reading cannot be
 * hidden by what it brings back.
 */
export function createListCache<T>(options: ListCacheOptions<T>): ListCache<T> {
  const { ttlMs, load, now = Date.now, maxStaleMs = ttlMs * 10, onRefreshError = () => undefined } = options

  let entry: { items: readonly T[]; loadedAt: number } | null = null
  let inflight: Promise<readonly T[]> | null = null
  let generation = 0

  function refresh(): Promise<readonly T[]> {
    if (inflight) return inflight
    const startedIn = generation
    const loading: Promise<readonly T[]> = load()
      .then((items) => {
        if (startedIn === generation) entry = { items, loadedAt: now() }
        return items
      })
      .finally(() => {
        if (inflight === loading) inflight = null
      })
    inflight = loading
    return loading
  }

  return {
    async get() {
      if (ttlMs <= 0) return load()

      if (entry) {
        const age = now() - entry.loadedAt
        if (age < ttlMs) return entry.items
        if (age < maxStaleMs) {
          refresh().catch(onRefreshError)
          return entry.items
        }
      }
      return refresh()
    },

    invalidate() {
      generation += 1
      entry = null
      inflight = null
    },
  }
}
