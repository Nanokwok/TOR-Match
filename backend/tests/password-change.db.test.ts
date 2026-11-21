import test, { after, afterEach, before, mock } from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"
import bcrypt from "bcryptjs"

import { createApp } from "../src/app"
import { PasswordResetToken } from "../src/models/PasswordResetToken.model"
import { User } from "../src/models/User.model"
import {
  NO_PASSWORD_MESSAGE,
  SAME_PASSWORD_MESSAGE,
  WRONG_CURRENT_PASSWORD_MESSAGE,
  changePassword,
} from "../src/services/password-change.service"
import { HIBP_RANGE_API_URL, PWNED_PASSWORD_ERROR_MESSAGE } from "../src/services/pwned-password.service"
import { ApiError } from "../src/utils/ApiError"
import { startMemoryDb } from "./helpers/memory-db"

let db: Awaited<ReturnType<typeof startMemoryDb>>
let server: Server
let base: string

before(async () => {
  db = await startMemoryDb()
  server = createApp().listen(0)
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
})

afterEach(async () => {
  mock.restoreAll()
  await db.clear()
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await db.stop()
})

const OLD_PASSWORD = "old password for tests"
const NEW_PASSWORD = "Zq7!vTn-2026-purple"

async function createAna(overrides: Record<string, unknown> = {}) {
  return User.create({
    name: "Ana",
    email: "ana@example.com",
    passwordHash: await bcrypt.hash(OLD_PASSWORD, 4),
    ...overrides,
  })
}

const notPwned = async () => false

async function rejection(promise: Promise<unknown>) {
  return promise.then(
    () => assert.fail("expected it to be rejected"),
    (error: unknown) => error as ApiError
  )
}

async function storedHash(id: unknown) {
  return (await User.findById(id).select("+passwordHash"))!.passwordHash!
}

test("the right current password sets the new one, which works while the old one does not", async () => {
  const ana = await createAna()
  const changedAt = new Date("2026-03-01T10:00:00Z")

  const result = await changePassword(String(ana._id), OLD_PASSWORD, NEW_PASSWORD, { isPwned: notPwned, now: () => changedAt })

  const hash = await storedHash(ana._id)
  assert.equal(await bcrypt.compare(NEW_PASSWORD, hash), true)
  assert.equal(await bcrypt.compare(OLD_PASSWORD, hash), false)
  assert.equal(result.tokenVersion, 1)
  assert.equal((await User.findById(ana._id))!.tokenVersion, 1)
})

test("a wrong current password is refused and nothing changes", async () => {
  const ana = await createAna()

  const error = await rejection(changePassword(String(ana._id), "not my password", NEW_PASSWORD, { isPwned: notPwned }))

  assert.equal(error.status, 400)
  assert.equal(error.message, WRONG_CURRENT_PASSWORD_MESSAGE)
  assert.equal(await bcrypt.compare(OLD_PASSWORD, await storedHash(ana._id)), true)
  assert.equal((await User.findById(ana._id))!.tokenVersion, 0)
})

test("the new password must differ from the current one", async () => {
  const ana = await createAna()
  const error = await rejection(changePassword(String(ana._id), OLD_PASSWORD, OLD_PASSWORD, { isPwned: notPwned }))
  assert.equal(error.status, 400)
  assert.equal(error.message, SAME_PASSWORD_MESSAGE)
})

test("a password found in a data breach is refused", async () => {
  const ana = await createAna()
  const error = await rejection(changePassword(String(ana._id), OLD_PASSWORD, "password123", { isPwned: async () => true }))
  assert.equal(error.message, PWNED_PASSWORD_ERROR_MESSAGE)
  assert.equal(await bcrypt.compare(OLD_PASSWORD, await storedHash(ana._id)), true)
})

test("a Google-only account has no password to change", async () => {
  const ana = await createAna({ passwordHash: undefined, googleId: "g-1" })
  const error = await rejection(changePassword(String(ana._id), "anything", NEW_PASSWORD, { isPwned: notPwned }))
  assert.equal(error.status, 400)
  assert.equal(error.message, NO_PASSWORD_MESSAGE)
})

test("an account that no longer exists is not signed in", async () => {
  const ana = await createAna()
  await User.deleteOne({ _id: ana._id })
  const error = await rejection(changePassword(String(ana._id), OLD_PASSWORD, NEW_PASSWORD, { isPwned: notPwned }))
  assert.equal(error.status, 401)
})

test("a reset link sent before the change stops working", async () => {
  const ana = await createAna()
  await PasswordResetToken.create({
    userId: ana._id,
    tokenHash: "a".repeat(64),
    expiresAt: new Date(Date.now() + 60_000),
  })

  await changePassword(String(ana._id), OLD_PASSWORD, NEW_PASSWORD, { isPwned: notPwned })

  assert.equal(await PasswordResetToken.countDocuments({ userId: ana._id }), 0)
})

// --- over HTTP ---------------------------------------------------------------

/** The breach lookup is a call to another service: answer it here, let calls to the test server through. */
function stubBreachLookup() {
  const realFetch = globalThis.fetch
  mock.method(globalThis, "fetch", (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
    String(input).startsWith(HIBP_RANGE_API_URL) ? Promise.resolve(new Response("")) : realFetch(input, init)
  )
}

const call = (path: string, init: { body?: unknown; token?: string; ip: string; method?: string }) =>
  fetch(`${base}${path}`, {
    method: init.method ?? "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": init.ip,
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  })

async function login(ip: string, password = OLD_PASSWORD): Promise<string> {
  const response = await call("/auth/login", { body: { email: "ana@example.com", password }, ip })
  assert.equal(response.status, 200)
  return (await response.json()).token
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test("POST /auth/change-password needs a signed-in user", async () => {
  const response = await call("/auth/change-password", { body: { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD }, ip: "10.2.0.1" })
  assert.equal(response.status, 401)
})

test("POST /auth/change-password changes the password, keeps this session and ends the others", async () => {
  stubBreachLookup()
  await createAna()
  const ip = "10.2.0.2"
  const thisSession = await login(ip)
  const otherSession = await login(ip)
  await pause(5) // a session counts as older only when it began strictly before the change

  const response = await call("/auth/change-password", {
    body: { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD },
    token: thisSession,
    ip,
  })
  assert.equal(response.status, 200)
  const { token: freshSession } = await response.json()
  assert.ok(freshSession)
  assert.equal(response.headers.get("x-refreshed-token"), freshSession)

  assert.equal((await call("/auth/me", { method: "GET", token: freshSession, ip })).status, 200, "the new token works")
  assert.equal((await call("/auth/me", { method: "GET", token: thisSession, ip })).status, 401, "the token that made the change does not")
  assert.equal((await call("/auth/me", { method: "GET", token: otherSession, ip })).status, 401, "nor does any other session")

  assert.equal((await call("/auth/login", { body: { email: "ana@example.com", password: OLD_PASSWORD }, ip })).status, 401)
  assert.equal((await call("/auth/login", { body: { email: "ana@example.com", password: NEW_PASSWORD }, ip })).status, 200)
})

test("POST /auth/change-password answers 400 for a wrong current password and for bad input", async () => {
  stubBreachLookup()
  await createAna()
  const ip = "10.2.0.3"
  const token = await login(ip)

  const wrong = await call("/auth/change-password", { body: { currentPassword: "nope nope nope", newPassword: NEW_PASSWORD }, token, ip })
  assert.equal(wrong.status, 400)
  assert.equal((await wrong.json()).error, WRONG_CURRENT_PASSWORD_MESSAGE)

  const short = await call("/auth/change-password", { body: { currentPassword: OLD_PASSWORD, newPassword: "short" }, token, ip })
  assert.equal(short.status, 400)

  const missing = await call("/auth/change-password", { body: { newPassword: NEW_PASSWORD }, token, ip })
  assert.equal(missing.status, 400)

  assert.equal((await call("/auth/me", { method: "GET", token, ip })).status, 200, "a refused change leaves the session alone")
})

test("POST /auth/change-password is limited to 5 tries a quarter hour per address of the visitor", async () => {
  stubBreachLookup()
  await createAna()
  const token = await login("10.2.0.4")

  for (let i = 0; i < 5; i++) {
    const response = await call("/auth/change-password", { body: { currentPassword: "wrong wrong wrong", newPassword: NEW_PASSWORD }, token, ip: "10.2.0.5" })
    assert.equal(response.status, 400)
  }
  const blocked = await call("/auth/change-password", { body: { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD }, token, ip: "10.2.0.5" })
  assert.equal(blocked.status, 429)
  assert.match((await blocked.json()).error, /password change/i)

  assert.equal(await bcrypt.compare(OLD_PASSWORD, await storedHashByEmail()), true, "the blocked try changed nothing")
})

async function storedHashByEmail() {
  return (await User.findOne({ email: "ana@example.com" }).select("+passwordHash"))!.passwordHash!
}
