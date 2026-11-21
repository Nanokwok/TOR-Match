import test, { mock } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { createApp } from "../src/app"
import { User } from "../src/models/User.model"
import { signAuthToken, verifyAuthToken } from "../src/utils/jwt"
import { isSessionTooOld } from "../src/middleware/auth.middleware"

const DAY_MS = 24 * 60 * 60 * 1000

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const server = http.createServer(createApp())
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }
  try {
    await run(`http://localhost:${address.port}`)
  } finally {
    mock.reset()
    server.close()
  }
}

test("isSessionTooOld: a sign-in just inside 7 days is kept, one just past it is refused", () => {
  const now = Date.now()
  assert.equal(isSessionTooOld(now), false)
  assert.equal(isSessionTooOld(now - 7 * DAY_MS + 1000), false)
  assert.equal(isSessionTooOld(now - 7 * DAY_MS - 1000), true)
  assert.equal(isSessionTooOld(now - 30 * DAY_MS), true)
})

test("isSessionTooOld: a token with no issuedAt is not refused, and the limit can be changed", () => {
  assert.equal(isSessionTooOld(undefined), false)
  assert.equal(isSessionTooOld(Date.now() - 2 * 60 * 1000, 60), true)
  assert.equal(isSessionTooOld(Date.now() - 30 * 1000, 60), false)
})

test("a session older than the maximum lifetime is refused even though the user was active a minute ago", async () => {
  const token = signAuthToken({
    sub: "662662662662662662662660",
    email: "old@example.com",
    role: "user",
    issuedAt: Date.now() - 8 * DAY_MS,
    lastActiveAt: Date.now() - 60 * 1000,
  })

  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
    assert.equal(res.status, 401)
    const body = (await res.json()) as { error: string }
    assert.equal(body.error, "Session expired, please sign in again")
  })
})

test("refreshing a session keeps the original issuedAt, so activity cannot extend the lifetime", async () => {
  const issuedAt = Date.now() - 2 * DAY_MS
  const token = signAuthToken({
    sub: "662662662662662662662660",
    email: "active@example.com",
    role: "user",
    issuedAt,
    lastActiveAt: Date.now() - 5 * 60 * 1000,
  })

  mock.method(User, "findById", async () => ({
    _id: "662662662662662662662660",
    email: "active@example.com",
    name: "Active User",
    role: "user",
  }))

  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
    assert.equal(res.status, 200)

    const refreshed = res.headers.get("x-refreshed-token")
    assert.ok(refreshed, "an active session is given a refreshed token")
    assert.equal(verifyAuthToken(refreshed!).issuedAt, issuedAt)
  })
})
