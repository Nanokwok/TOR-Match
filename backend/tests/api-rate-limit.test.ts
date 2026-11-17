import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import express from "express"
import { createApp } from "../src/app"
import { env } from "../src/config/env"
import { createApiRateLimiter } from "../src/middleware/rate-limit.middleware"
import { errorMiddleware } from "../src/middleware/error.middleware"

async function withServer(app: express.Express, run: (base: string) => Promise<void>) {
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }
  try {
    await run(`http://localhost:${address.port}`)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

/**
 * /api/auth/me answers 401 without touching the database, so it is a request
 * that costs nothing and still goes through every middleware in front of the routes.
 * `ip` goes in X-Forwarded-For, which the app trusts one hop of.
 */
const hit = (base: string, ip: string, path = "/api/auth/me") =>
  fetch(`${base}${path}`, { headers: { "X-Forwarded-For": ip } })

test("by default a client gets 100 requests a minute", () => {
  assert.equal(env.rateLimitMaxRequests, 100)
  assert.equal(env.rateLimitWindowMs, 60_000)
})

test("the 101st request in a window is refused with 429 in the ApiError shape", async () => {
  await withServer(createApp(), async (base) => {
    for (let i = 1; i <= env.rateLimitMaxRequests; i++) {
      const res = await hit(base, "10.0.0.1")
      assert.equal(res.status, 401, `request ${i} should reach the route`)
      await res.arrayBuffer()
    }

    const blocked = await hit(base, "10.0.0.1")
    assert.equal(blocked.status, 429)
    const body = await blocked.json()
    assert.match(body.error, /too many requests/i)
    assert.deepEqual(body.details, { limit: 100, retryAfterSeconds: 60 })
  })
})

test("responses carry the standard rate limit headers, and Retry-After once blocked", async () => {
  await withServer(createApp(), async (base) => {
    const first = await hit(base, "10.0.0.2")
    await first.arrayBuffer()
    assert.equal(first.headers.get("ratelimit-limit"), "100")
    assert.equal(first.headers.get("ratelimit-remaining"), "99")
    assert.ok(Number(first.headers.get("ratelimit-reset")) > 0)
    assert.equal(first.headers.get("x-ratelimit-limit"), null, "legacy X-RateLimit-* headers are off")
    assert.equal(first.headers.get("retry-after"), null)

    for (let i = 2; i <= env.rateLimitMaxRequests; i++) await (await hit(base, "10.0.0.2")).arrayBuffer()
    const blocked = await hit(base, "10.0.0.2")
    await blocked.arrayBuffer()
    assert.equal(blocked.status, 429)
    assert.equal(blocked.headers.get("ratelimit-remaining"), "0")
    assert.ok(Number(blocked.headers.get("retry-after")) > 0)
  })
})

test("the health check is never limited and never uses up a client's allowance", async () => {
  await withServer(createApp(), async (base) => {
    // Far past the limit: a monitor polling /health must not be told to back off.
    for (let i = 0; i < env.rateLimitMaxRequests + 20; i++) {
      const res = await hit(base, "10.0.0.3", "/api/health")
      assert.equal(res.status, 200)
      await res.arrayBuffer()
    }
    // ...and the same client still has its whole allowance for real routes.
    const res = await hit(base, "10.0.0.3")
    await res.arrayBuffer()
    assert.equal(res.status, 401)
    assert.equal(res.headers.get("ratelimit-remaining"), "99")
  })
})

test("clients are counted separately: one being blocked does not block another", async () => {
  await withServer(createApp(), async (base) => {
    for (let i = 0; i <= env.rateLimitMaxRequests; i++) await (await hit(base, "10.0.0.4")).arrayBuffer()
    assert.equal((await hit(base, "10.0.0.4")).status, 429)

    const other = await hit(base, "10.0.0.5")
    await other.arrayBuffer()
    assert.equal(other.status, 401)
    assert.equal(other.headers.get("ratelimit-remaining"), "99")
  })
})

test("each app counts for itself, so one test's traffic cannot spill into the next", async () => {
  await withServer(createApp(), async (base) => {
    for (let i = 0; i <= env.rateLimitMaxRequests; i++) await (await hit(base, "10.0.0.6")).arrayBuffer()
    assert.equal((await hit(base, "10.0.0.6")).status, 429)
  })
  await withServer(createApp(), async (base) => {
    const res = await hit(base, "10.0.0.6")
    await res.arrayBuffer()
    assert.equal(res.status, 401)
  })
})

test("the limit and the window can be set, and a window that has passed gives the allowance back", async () => {
  const app = express()
  app.set("trust proxy", 1)
  app.use("/api", createApiRateLimiter({ limit: 2, windowMs: 300 }))
  app.get("/api/ping", (_req, res) => res.status(200).json({ ok: true }))
  app.use(errorMiddleware)

  await withServer(app, async (base) => {
    assert.equal((await hit(base, "10.0.0.7", "/api/ping")).status, 200)
    assert.equal((await hit(base, "10.0.0.7", "/api/ping")).status, 200)
    const blocked = await hit(base, "10.0.0.7", "/api/ping")
    assert.equal(blocked.status, 429)
    assert.deepEqual((await blocked.json()).details, { limit: 2, retryAfterSeconds: 1 })

    await new Promise((resolve) => setTimeout(resolve, 400))
    assert.equal((await hit(base, "10.0.0.7", "/api/ping")).status, 200)
  })
})
