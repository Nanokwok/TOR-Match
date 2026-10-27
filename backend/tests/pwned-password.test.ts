import test, { mock } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import {
  hashPasswordSha1,
  isSuffixInPwnedList,
  isPasswordPwned,
  PWNED_PASSWORD_ERROR_MESSAGE,
  HIBP_RANGE_API_URL,
} from "../src/services/pwned-password.service"
import { createApp } from "../src/app"
import { User } from "../src/models/User.model"

test("hashPasswordSha1 calculates a 40-char uppercase SHA-1 and splits into 5-char prefix and 35-char suffix", () => {
  // Test vector SHA-1 hash for the string 'password'
  const result = hashPasswordSha1("password")
  assert.equal(result.hash, "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8")
  assert.equal(result.prefix, "5BAA6")
  assert.equal(result.suffix, "1E4C9B93F3F0682250B6CF8331B7EE68FD8")
  assert.equal(result.prefix.length, 5)
  assert.equal(result.suffix.length, 35)
  assert.equal(result.prefix + result.suffix, result.hash)
})

test("hashPasswordSha1 works with different passwords and unicode characters", () => {
  const result = hashPasswordSha1("P@ssw0rd_123!_ภาษาไทย")
  assert.equal(result.hash.length, 40)
  assert.equal(result.prefix.length, 5)
  assert.equal(result.suffix.length, 35)
  assert.equal(/^[0-9A-F]{40}$/.test(result.hash), true)
})

test("isSuffixInPwnedList identifies breached hashes with count > 0", () => {
  const responseText = [
    "003CD215739D7C1B2218670D26F81408237:2",
    "1E4C9B93F3F0682250B6CF8331B7EE68FD8:52372427",
    "00658BFD1E05761042698D19D32CD9F1A8F:15",
  ].join("\r\n")

  assert.equal(isSuffixInPwnedList(responseText, "1E4C9B93F3F0682250B6CF8331B7EE68FD8"), true)
  assert.equal(isSuffixInPwnedList(responseText, "1e4c9b93f3f0682250b6cf8331b7ee68fd8"), true, "Case-insensitive check")
})

test("isSuffixInPwnedList returns false for clean passwords not in HIBP response", () => {
  const responseText = [
    "003CD215739D7C1B2218670D26F81408237:2",
    "00658BFD1E05761042698D19D32CD9F1A8F:15",
  ].join("\n")

  assert.equal(isSuffixInPwnedList(responseText, "1E4C9B93F3F0682250B6CF8331B7EE68FD8"), false)
})

test("isSuffixInPwnedList ignores padding entries where count is 0 (Add-Padding: true)", () => {
  const responseText = [
    "003CD215739D7C1B2218670D26F81408237:2",
    "1E4C9B93F3F0682250B6CF8331B7EE68FD8:0", // padding entry
    "00658BFD1E05761042698D19D32CD9F1A8F:15",
  ].join("\n")

  assert.equal(isSuffixInPwnedList(responseText, "1E4C9B93F3F0682250B6CF8331B7EE68FD8"), false)
})

test("isPasswordPwned queries HIBP range API with prefix and Add-Padding header, detecting breached passwords", async () => {
  const requestedUrls: string[] = []
  const requestedHeaders: HeadersInit[] = []

  const mockFetch: typeof fetch = async (input, init) => {
    requestedUrls.push(String(input))
    if (init?.headers) requestedHeaders.push(init.headers)
    return new Response(
      "003CD215739D7C1B2218670D26F81408237:2\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:999\n",
      { status: 200 }
    )
  }

  const pwned = await isPasswordPwned("password", { fetchFn: mockFetch })
  assert.equal(pwned, true)
  assert.equal(requestedUrls.length, 1)
  assert.equal(requestedUrls[0], `${HIBP_RANGE_API_URL}/5BAA6`)

  const headers = new Headers(requestedHeaders[0])
  assert.equal(headers.get("Add-Padding"), "true")
})

test("isPasswordPwned returns false for unbreached password", async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      "003CD215739D7C1B2218670D26F81408237:2\n00658BFD1E05761042698D19D32CD9F1A8F:15\n",
      { status: 200 }
    )
  }

  const pwned = await isPasswordPwned("password", { fetchFn: mockFetch })
  assert.equal(pwned, false)
})

test("isPasswordPwned gracefully falls back when HIBP times out", async () => {
  const mockFetch: typeof fetch = async (_input, init) => {
    return new Promise((resolve, reject) => {
      const signal = init?.signal
      if (signal) {
        signal.addEventListener("abort", () => {
          reject(new Error("The operation was aborted due to timeout"))
        })
      }
      setTimeout(() => {
        resolve(new Response("1E4C9B93F3F0682250B6CF8331B7EE68FD8:100", { status: 200 }))
      }, 500)
    })
  }

  // Use a short timeout of 50ms to verify fallback
  const pwned = await isPasswordPwned("password", { fetchFn: mockFetch, timeoutMs: 50 })
  assert.equal(pwned, false, "Must return false on timeout rather than throwing")
})

test("isPasswordPwned gracefully falls back when HIBP is unreachable (network error)", async () => {
  const mockFetch: typeof fetch = async () => {
    throw new TypeError("fetch failed: ECONNREFUSED")
  }

  const pwned = await isPasswordPwned("password", { fetchFn: mockFetch })
  assert.equal(pwned, false, "Must return false on network error rather than throwing")
})

test("isPasswordPwned gracefully falls back when HIBP returns non-200 HTTP status", async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response("Internal Server Error", { status: 500 })
  }

  const pwned = await isPasswordPwned("password", { fetchFn: mockFetch })
  assert.equal(pwned, false, "Must return false on HTTP 500 rather than throwing")
})

test("POST /api/auth/register rejects breached passwords with HTTP 400 and clear guidance", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: string | URL) => {
    const urlStr = String(input)
    if (urlStr.includes("/range/5BAA6")) {
      return new Response("1E4C9B93F3F0682250B6CF8331B7EE68FD8:12345\n", { status: 200 })
    }
    return new Response("", { status: 200 })
  }) as typeof globalThis.fetch

  const app = createApp()
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }

  try {
    const res = await originalFetch(`http://localhost:${address.port}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "breached@example.com",
        password: "password", // Known breached password
      }),
    })

    assert.equal(res.status, 400)
    const json = (await res.json()) as { error: string }
    assert.equal(json.error, PWNED_PASSWORD_ERROR_MESSAGE)
  } finally {
    globalThis.fetch = originalFetch
    server.close()
  }
})

test("POST /api/auth/register allows registration to proceed when HIBP times out or is unreachable", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed: network unreachable")
  }) as typeof globalThis.fetch

  // Stub User.findOne and User.create so registration completes without DB
  mock.method(User, "findOne", async () => null)
  mock.method(User, "create", async (data: Record<string, unknown>) => ({
    _id: "662662662662662662662662",
    role: "user",
    ...data,
  }))

  const app = createApp()
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }

  try {
    const res = await originalFetch(`http://localhost:${address.port}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "fallback@example.com",
        password: "MySecurePassword123!",
      }),
    })

    // Should succeed with 201 Created instead of throwing 500 error
    assert.equal(res.status, 201)
    const json = (await res.json()) as { user: { email: string; name: string }; token: string }
    assert.equal(json.user.email, "fallback@example.com")
    assert.ok(json.token)
  } finally {
    mock.reset()
    globalThis.fetch = originalFetch
    server.close()
  }
})

test("POST /api/auth/register creates user when password is clean and unbreached", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    // Return empty list of matches (clean password)
    return new Response("003CD215739D7C1B2218670D26F81408237:2\n", { status: 200 })
  }) as typeof globalThis.fetch

  mock.method(User, "findOne", async () => null)
  mock.method(User, "create", async (data: Record<string, unknown>) => ({
    _id: "662662662662662662662663",
    role: "user",
    ...data,
  }))

  const app = createApp()
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }

  try {
    const res = await originalFetch(`http://localhost:${address.port}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Clean User",
        email: "clean@example.com",
        password: "SuperUniquePassword2026!#$",
      }),
    })

    assert.equal(res.status, 201)
    const json = (await res.json()) as { user: { email: string; name: string }; token: string }
    assert.equal(json.user.email, "clean@example.com")
    assert.ok(json.token)
  } finally {
    mock.reset()
    globalThis.fetch = originalFetch
    server.close()
  }
})
