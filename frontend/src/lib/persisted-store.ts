/**
 * A localStorage-backed value exposed as a `useSyncExternalStore` source.
 *
 * Reading storage during an effect and calling setState forces a second render
 * pass on every mount; an external store lets React read the stored value while
 * rendering on the client and fall back to `fallback` on the server, so hydration
 * still matches.
 */
export type PersistedStore<T extends string> = {
  subscribe: (onStoreChange: () => void) => () => void
  getSnapshot: () => T
  /** The server has no localStorage, so it always renders the fallback. */
  getServerSnapshot: () => T
  set: (value: T) => void
}

export function createPersistedStore<T extends string>(
  storageKey: string,
  fallback: T,
  isValid: (value: unknown) => value is T
): PersistedStore<T> {
  const listeners = new Set<() => void>()
  let cached: T | null = null

  function read(): T {
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (isValid(stored)) return stored
    } catch {
      // Ignore storage access errors (private mode, blocked cookies, etc.)
    }
    return fallback
  }

  function notify() {
    cached = null
    for (const listener of listeners) listener()
  }

  return {
    subscribe(onStoreChange) {
      listeners.add(onStoreChange)

      // `storage` only fires in *other* tabs, so same-tab writes go through set().
      function onStorage(event: StorageEvent) {
        if (event.key === storageKey || event.key === null) notify()
      }
      window.addEventListener("storage", onStorage)

      return () => {
        listeners.delete(onStoreChange)
        window.removeEventListener("storage", onStorage)
      }
    },

    getSnapshot() {
      cached ??= read()
      return cached
    },

    getServerSnapshot() {
      return fallback
    },

    set(value) {
      try {
        window.localStorage.setItem(storageKey, value)
      } catch {
        // Ignore storage write errors
      }
      notify()
    },
  }
}