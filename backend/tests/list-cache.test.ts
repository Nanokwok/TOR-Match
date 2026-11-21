import test from "node:test"
import assert from "node:assert/strict"

import { createListCache } from "../src/utils/list-cache"

/** A clock and a loader the test controls: each load returns the next number, and can be held open. */
function harness(options: { ttlMs?: number; maxStaleMs?: number } = {}) {
  let time = 1_000
  let loads = 0
  const errors: unknown[] = []
  let failNext: Error | null = null
  let gate: Promise<void> | null = null

  const cache = createListCache<number>({
    ttlMs: options.ttlMs ?? 100,
    maxStaleMs: options.maxStaleMs,
    now: () => time,
    onRefreshError: (error) => errors.push(error),
    load: async () => {
      loads += 1
      const mine = loads
      if (gate) await gate
      if (failNext) {
        const error = failNext
        failNext = null
        throw error
      }
      return [mine]
    },
  })

  return {
    cache,
    errors,
    get loads() {
      return loads
    },
    advance: (ms: number) => {
      time += ms
    },
    failNextLoad: (error: Error) => {
      failNext = error
    },
    hold: () => {
      let release!: () => void
      gate = new Promise<void>((resolve) => {
        release = resolve
      })
      return () => {
        gate = null
        release()
      }
    },
  }
}

/** Lets a background refresh that was started but not awaited finish. */
const settle = () => new Promise((resolve) => setImmediate(resolve))

test("a list is loaded once and then served from memory while it is fresh", async () => {
  const h = harness()
  assert.deepEqual(await h.cache.get(), [1])
  h.advance(99)
  assert.deepEqual(await h.cache.get(), [1])
  assert.equal(h.loads, 1)
})

test("past its time it is still served at once, and refreshed in the background for the next caller", async () => {
  const h = harness()
  await h.cache.get()
  h.advance(150)

  assert.deepEqual(await h.cache.get(), [1], "the caller does not wait for the refresh")
  await settle()
  assert.equal(h.loads, 2)
  assert.deepEqual(await h.cache.get(), [2])
})

test("callers arriving while the first load is under way share it", async () => {
  const h = harness()
  const release = h.hold()
  const calls = [h.cache.get(), h.cache.get(), h.cache.get()]
  release()
  assert.deepEqual(await Promise.all(calls), [[1], [1], [1]])
  assert.equal(h.loads, 1)
})

test("too old to serve: the caller waits for a fresh list", async () => {
  const h = harness({ ttlMs: 100, maxStaleMs: 1_000 })
  await h.cache.get()
  h.advance(1_001)
  assert.deepEqual(await h.cache.get(), [2])
})

test("invalidate drops the list, so the next caller waits for a fresh one", async () => {
  const h = harness()
  await h.cache.get()
  h.cache.invalidate()
  assert.deepEqual(await h.cache.get(), [2])
})

test("a load that began before an invalidate is not kept: what it read may predate the change", async () => {
  const h = harness()
  const release = h.hold()
  const early = h.cache.get() // starts load 1, held open
  h.cache.invalidate() // a TOR is published while load 1 is reading
  release()
  await early

  assert.deepEqual(await h.cache.get(), [2], "load 1 was thrown away, so this is a fresh load")
})

test("a failed background refresh keeps serving the old list and reports the error", async () => {
  const h = harness()
  await h.cache.get()
  h.advance(150)
  h.failNextLoad(new Error("database unreachable"))

  assert.deepEqual(await h.cache.get(), [1])
  await settle()
  assert.equal(h.errors.length, 1)
  assert.match((h.errors[0] as Error).message, /database unreachable/)
  assert.deepEqual(await h.cache.get(), [1], "the next caller still gets the old list, and starts another refresh")
  await settle()
  assert.deepEqual(await h.cache.get(), [3], "which succeeded")
})

test("with nothing to fall back on, a failed load is the caller's error", async () => {
  const h = harness()
  h.failNextLoad(new Error("database unreachable"))
  await assert.rejects(h.cache.get(), /database unreachable/)
  assert.deepEqual(await h.cache.get(), [2], "and the failure is not remembered")
})

test("a time of 0 turns the cache off", async () => {
  const h = harness({ ttlMs: 0 })
  assert.deepEqual(await h.cache.get(), [1])
  assert.deepEqual(await h.cache.get(), [2])
})
