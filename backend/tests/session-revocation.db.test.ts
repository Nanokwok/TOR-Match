import test, { after, afterEach, before } from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

import { createApp } from "../src/app"
import { env } from "../src/config/env"
import { User } from "../src/models/User.model"
import { PasswordResetToken } from "../src/models/PasswordResetToken.model"
import { requestPasswordReset, resetPassword } from "../src/services/password-reset.service"
import { signAuthToken } from "../src/utils/jwt"
import { startMemoryDb } from "./helpers/memory-db"

let db: Awaited<ReturnType<typeof startMemoryDb>>
let server: Server
let base: string

before(async () => {
  db = await startMemoryDb()
  server = createApp().listen(0)
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
})

afterEach(() => db.clear())

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await db.stop()
})

const PASSWORD = "old password for tests"
const NEW_PASSWORD = "Zq7!vTn-2026-purple"

async function createUser(email: string) {
  return User.create({ name: "Ana", email, passwordHash: await bcrypt.hash(PASSWORD, 4) })
}

// signAuthToken fills issuedAt itself, but only when the key is absent, so do not pass it as undefined.
const tokenFor = (user: { _id: unknown; email: string }, tokenVersion = 0) =>
  signAuthToken({ sub: String(user._id), email: user.email, role: "user", tokenVersion })

const me = (credentials: { cookie?: string; bearer?: string }) =>
  fetch(`${base}/auth/me`, {
    headers: {
      ...(credentials.cookie ? { cookie: `${env.authCookieName}=${credentials.cookie}` } : {}),
      ...(credentials.bearer ? { authorization: `Bearer ${credentials.bearer}` } : {}),
    },
  })

const changePassword = (id: unknown) =>
  User.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } })

test("before any reset, a session works as always", async () => {
  const ana = await createUser("ana@example.com")
  assert.equal((await me({ cookie: tokenFor(ana) })).status, 200)
  assert.equal((await me({ bearer: tokenFor(ana) })).status, 200)
})

test("after a reset, a session from before it is refused, by cookie or by bearer token", async () => {
  const ana = await createUser("ana@example.com")
  const before = tokenFor(ana, 0)
  await changePassword(ana._id)

  const byCookie = await me({ cookie: before })
  assert.equal(byCookie.status, 401)
  assert.equal((await byCookie.json()).error, "Session has been revoked")
  assert.equal((await me({ bearer: before })).status, 401)
})

test("a session started after the reset works", async () => {
  const ana = await createUser("ana@example.com")
  await changePassword(ana._id)
  assert.equal((await me({ cookie: tokenFor(ana, 1) })).status, 200)
})

test("keeping a session alive does not carry it past a reset", async () => {
  const ana = await createUser("ana@example.com")
  // A token issued long ago whose last activity is recent: what the sliding refresh produces.
  const refreshed = signAuthToken({
    sub: String(ana._id),
    email: ana.email,
    role: "user",
    issuedAt: Date.now() - 3 * 24 * 3600_000,
    lastActiveAt: Date.now(),
  })
  await changePassword(ana._id)
  assert.equal((await me({ cookie: refreshed })).status, 401)
})

test("a token with no issue time is refused once the password has changed", async () => {
  const ana = await createUser("ana@example.com")
  const old = jwt.sign({ sub: String(ana._id), email: ana.email, role: "user" }, env.jwtSecret, { expiresIn: "7d" })
  assert.equal((await me({ cookie: old })).status, 200, "fine while the password has never changed")
  await changePassword(ana._id)
  assert.equal((await me({ cookie: old })).status, 401)
})

test("a stale cookie does not stop a fresh bearer token from working, nor the other way round", async () => {
  const ana = await createUser("ana@example.com")
  const stale = tokenFor(ana, 0)
  await changePassword(ana._id)
  const fresh = tokenFor(ana, 1)

  assert.equal((await me({ cookie: stale, bearer: fresh })).status, 200)
  assert.equal((await me({ cookie: fresh, bearer: stale })).status, 200)
  assert.equal((await me({ cookie: stale, bearer: stale })).status, 401)
})

test("another account's sessions are not affected", async () => {
  const ana = await createUser("ana@example.com")
  const ben = await createUser("ben@example.com")
  const benToken = tokenFor(ben, 0)
  await changePassword(ana._id)
  assert.equal((await me({ cookie: benToken })).status, 200)
})

test("a public page treats a revoked session as a visitor who is not signed in", async () => {
  const ana = await createUser("ana@example.com")
  const before = tokenFor(ana, 0)
  await changePassword(ana._id)
  // /tors accepts anonymous visitors; it must still answer, just without a signed-in user.
  const response = await fetch(`${base}/tors`, { headers: { cookie: `${env.authCookieName}=${before}` } })
  assert.equal(response.status, 200)
})

test("a token that does not verify is left for the auth middleware to refuse", async () => {
  assert.equal((await me({ cookie: "garbage" })).status, 401)
})

test("resetting the password through the emailed link signs out the old session, and logging in again works", async () => {
  const ana = await createUser("ana@example.com")
  const oldSession = tokenFor(ana, 0)
  assert.equal((await me({ cookie: oldSession })).status, 200)

  const sent: string[] = []
  await requestPasswordReset("ana@example.com", {
    send: async (message: { text: string }) => {
      sent.push(message.text)
      return true
    },
  })
  const token = sent[0].match(/token=([A-Za-z0-9_-]+)/)![1]
  await resetPassword(token, NEW_PASSWORD, { isPwned: async () => false })
  assert.equal(await PasswordResetToken.countDocuments(), 0)

  assert.equal((await me({ cookie: oldSession })).status, 401, "the session from before the reset is gone")

  const login = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "10.2.0.1" },
    body: JSON.stringify({ email: "ana@example.com", password: NEW_PASSWORD }),
  })
  assert.equal(login.status, 200)
  const { token: newSession } = await login.json()
  assert.equal((await me({ cookie: newSession })).status, 200, "a session started after the reset works")
})
