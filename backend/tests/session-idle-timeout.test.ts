import test, { mock } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { createApp } from "../src/app"
import { User } from "../src/models/User.model"
import { signAuthToken, verifyAuthToken } from "../src/utils/jwt"
import { isSessionExpired } from "../src/middleware/auth.middleware"

test("signAuthToken populates issuedAt and lastActiveAt timestamps by default", () => {
  const before = Date.now()
  const token = signAuthToken({
    sub: "u123",
    email: "user@example.com",
    role: "user",
  })
  const after = Date.now()

  const payload = verifyAuthToken(token)
  assert.equal(payload.sub, "u123")
  assert.equal(payload.email, "user@example.com")
  assert.equal(payload.role, "user")
  assert.ok(payload.issuedAt && payload.issuedAt >= before && payload.issuedAt <= after)
  assert.ok(payload.lastActiveAt && payload.lastActiveAt >= before && payload.lastActiveAt <= after)
})

test("isSessionExpired boundary test: verifies 30-minute idle threshold (29m59s active, 30m01s expired)", () => {
  const now = Date.now()

  // 1 minute ago - active
  assert.equal(isSessionExpired(now - 60 * 1000), false)

  // 29 minutes and 59 seconds ago - active (1s before boundary)
  assert.equal(isSessionExpired(now - (29 * 60 + 59) * 1000), false)

  // Exactly 30 minutes ago - active at the boundary
  assert.equal(isSessionExpired(now - 30 * 60 * 1000), false)

  // 30 minutes and 1 second ago - EXPIRED (1s past boundary)
  assert.equal(isSessionExpired(now - (30 * 60 + 1) * 1000), true)

  // 1 hour ago - EXPIRED
  assert.equal(isSessionExpired(now - 60 * 60 * 1000), true)
})

test("isSessionExpired supports configurable maxIdleSeconds parameter", () => {
  const now = Date.now()
  const customIdleSeconds = 120 // 2 minutes

  // 100 seconds ago (< 120s): active
  assert.equal(isSessionExpired(now - 100 * 1000, customIdleSeconds), false)

  // 120 seconds ago (= 120s): active
  assert.equal(isSessionExpired(now - 120 * 1000, customIdleSeconds), false)

  // 121 seconds ago (> 120s): expired
  assert.equal(isSessionExpired(now - 121 * 1000, customIdleSeconds), true)
})

test("requireAuth rejects expired session tokens with HTTP 401 and specific error message", async () => {
  const app = createApp()
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }

  // Generate a token whose last active timestamp is 35 minutes ago
  const expiredToken = signAuthToken({
    sub: "u123",
    email: "idle@example.com",
    role: "user",
    lastActiveAt: Date.now() - 35 * 60 * 1000,
  })

  try {
    const res = await fetch(`http://localhost:${address.port}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
    })

    assert.equal(res.status, 401)
    const body = (await res.json()) as { error: string }
    assert.equal(body.error, "Session expired due to inactivity")
  } finally {
    server.close()
  }
})

test("requireAuth allows active session tokens and provides sliding window refreshed token", async () => {
  const app = createApp()
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }

  // Active token from 5 minutes ago
  const activeToken = signAuthToken({
    sub: "662662662662662662662660",
    email: "active@example.com",
    role: "user",
    lastActiveAt: Date.now() - 5 * 60 * 1000,
  })

  mock.method(User, "findById", async () => ({
    _id: "662662662662662662662660",
    email: "active@example.com",
    name: "Active User",
    role: "user",
  }))

  try {
    const res = await fetch(`http://localhost:${address.port}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${activeToken}`,
      },
    })

    assert.equal(res.status, 200)
    const body = (await res.json()) as { user: { email: string } }
    assert.equal(body.user.email, "active@example.com")

    // Verify sliding window update: response includes X-Refreshed-Token
    const refreshedToken = res.headers.get("x-refreshed-token")
    assert.ok(refreshedToken, "X-Refreshed-Token header must be sent on active interaction")
    const refreshedPayload = verifyAuthToken(refreshedToken!)
    assert.ok(
      refreshedPayload.lastActiveAt && refreshedPayload.lastActiveAt > Date.now() - 5000,
      "Refreshed token must have updated lastActiveAt timestamp"
    )
  } finally {
    mock.reset()
    server.close()
  }
})

test("POST /api/auth/refresh updates session sliding window explicitly", async () => {
  const app = createApp()
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }

  const activeToken = signAuthToken({
    sub: "662662662662662662662660",
    email: "active@example.com",
    role: "user",
    lastActiveAt: Date.now() - 10 * 60 * 1000,
  })

  try {
    const res = await fetch(`http://localhost:${address.port}/api/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${activeToken}`,
      },
    })

    assert.equal(res.status, 200)
    const body = (await res.json()) as { token: string; user: { email: string } }
    assert.ok(body.token)
    assert.equal(body.user.email, "active@example.com")

    const newPayload = verifyAuthToken(body.token)
    assert.ok(
      newPayload.lastActiveAt && newPayload.lastActiveAt > Date.now() - 5000,
      "Refreshed session must have current lastActiveAt"
    )
  } finally {
    server.close()
  }
})

test("POST /api/auth/logout invalidates cookies with maxAge 0", async () => {
  const app = createApp()
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }

  try {
    const res = await fetch(`http://localhost:${address.port}/api/auth/logout`, {
      method: "POST",
    })

    assert.equal(res.status, 204)
    const setCookieHeaders = res.headers.getSetCookie()
    assert.ok(setCookieHeaders.length >= 1, "Must set-cookie on logout to clear session")

    // Verify cookies are expired with Max-Age=0
    const clearedCookies = setCookieHeaders.join("; ")
    assert.match(clearedCookies, /Max-Age=0/i)
  } finally {
    server.close()
  }
})

test("Edge proxy JWT payload decoding accurately reads lastActiveAt without secret", () => {
  const token = signAuthToken({
    sub: "u-edge-test",
    email: "edge@example.com",
    role: "user",
    lastActiveAt: 1700000000000,
  })

  // Edge decode algorithm (base64url to JSON payload)
  const parts = token.split(".")
  assert.equal(parts.length, 3)
  const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
    sub: string
    email: string
    lastActiveAt: number
  }

  assert.equal(payload.sub, "u-edge-test")
  assert.equal(payload.email, "edge@example.com")
  assert.equal(payload.lastActiveAt, 1700000000000)
})

