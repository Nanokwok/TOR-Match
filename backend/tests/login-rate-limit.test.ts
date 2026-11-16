import test, { mock } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import bcrypt from "bcryptjs"
import { createApp } from "../src/app"
import { User } from "../src/models/User.model"
import { LOGIN_RATE_LIMIT_MESSAGE } from "../src/middleware/rate-limit.middleware"

test("login rate limiting allows 5 failed attempts per IP and blocks the 6th with HTTP 429", async () => {
  const app = createApp()
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }

  // Stub User.findOne to simulate non-existent user (causing 401 Unauthorized)
  mock.method(User, "findOne", () => ({
    select: async () => null,
  }))

  try {
    const url = `http://localhost:${address.port}/api/auth/login`
    const clientIp = "192.168.1.101"

    // 5 failed login attempts
    for (let i = 1; i <= 5; i++) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": clientIp,
        },
        body: JSON.stringify({
          email: "user@example.com",
          password: "wrong-password",
        }),
      })

      assert.equal(res.status, 401, `Attempt ${i} should fail with 401`)
      assert.equal(res.headers.get("ratelimit-limit"), "5")
      assert.ok(res.headers.get("ratelimit-reset"))
    }

    // 6th attempt should be blocked with 429 Too Many Requests
    const resBlocked = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIp,
      },
      body: JSON.stringify({
        email: "user@example.com",
        password: "wrong-password",
      }),
    })

    assert.equal(resBlocked.status, 429, "6th attempt must be blocked with HTTP 429")

    // Standard rate limit headers
    assert.equal(resBlocked.headers.get("ratelimit-limit"), "5")
    assert.equal(resBlocked.headers.get("ratelimit-remaining"), "0")
    assert.ok(resBlocked.headers.get("ratelimit-reset"), "RateLimit-Reset header must be present")
    assert.ok(resBlocked.headers.get("retry-after"), "Retry-After header must be present")

    // Localized error message
    const body = (await resBlocked.json()) as { error: string }
    assert.equal(body.error, LOGIN_RATE_LIMIT_MESSAGE)
  } finally {
    mock.reset()
    server.close()
  }
})

test("rate limiting isolates hit counts per IP via reverse proxy trust proxy", async () => {
  const app = createApp()
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }

  mock.method(User, "findOne", () => ({
    select: async () => null,
  }))

  try {
    const url = `http://localhost:${address.port}/api/auth/login`
    const ipA = "10.0.0.1"
    const ipB = "10.0.0.2"

    // Exhaust limit for IP A (5 failures)
    for (let i = 0; i < 5; i++) {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": ipA,
        },
        body: JSON.stringify({
          email: "target@example.com",
          password: "wrong",
        }),
      })
    }

    // IP A is blocked with 429
    const resA = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": ipA,
      },
      body: JSON.stringify({ email: "target@example.com", password: "wrong" }),
    })
    assert.equal(resA.status, 429, "IP A should be rate-limited")

    // IP B is NOT blocked
    const resB = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": ipB,
      },
      body: JSON.stringify({ email: "target@example.com", password: "wrong" }),
    })
    assert.equal(resB.status, 401, "IP B should not be affected by IP A's limit")
    assert.equal(resB.headers.get("ratelimit-remaining"), "4")
  } finally {
    mock.reset()
    server.close()
  }
})

test("successful login does not count as a failed attempt", async () => {
  const app = createApp()
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }

  const hashedPassword = await bcrypt.hash("validpassword123", 10)
  mock.method(User, "findOne", () => ({
    select: async () => ({
      _id: "662662662662662662662669",
      email: "legit@example.com",
      name: "Legit User",
      role: "user",
      passwordHash: hashedPassword,
    }),
  }))

  try {
    const url = `http://localhost:${address.port}/api/auth/login`
    const clientIp = "172.16.0.50"

    // Perform multiple successful logins
    for (let i = 0; i < 6; i++) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": clientIp,
        },
        body: JSON.stringify({
          email: "legit@example.com",
          password: "validpassword123",
        }),
      })

      assert.equal(res.status, 200, `Login ${i + 1} should succeed with 200`)
    }

    // After 6 successful logins, remaining failed attempts are still available
    const failRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIp,
      },
      body: JSON.stringify({
        email: "legit@example.com",
        password: "invalid-password",
      }),
    })
    assert.equal(failRes.status, 401, "Should fail with 401, not 429")
  } finally {
    mock.reset()
    server.close()
  }
})
