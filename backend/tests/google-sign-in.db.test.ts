import test, { after, afterEach, before } from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"
import bcrypt from "bcryptjs"

import { createApp } from "../src/app"
import type { GoogleProfile } from "../src/domain/google-account"
import { generateResetToken } from "../src/domain/password-reset"
import { PasswordResetToken } from "../src/models/PasswordResetToken.model"
import { User } from "../src/models/User.model"
import { signInWithGoogleProfile } from "../src/services/google-sign-in.service"
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

const profile = (overrides: Partial<GoogleProfile> = {}): GoogleProfile => ({
  googleId: "g-ana",
  email: "ana@example.com",
  emailVerified: true,
  name: "Ana",
  ...overrides,
})

const ATTACKER_PASSWORD = "attacker chosen password"

/** An account somebody registered with an email address they may not own. */
async function createPasswordAccount() {
  return User.create({ name: "Ana", email: "ana@example.com", passwordHash: await bcrypt.hash(ATTACKER_PASSWORD, 4) })
}

const login = (password: string, ip: string) =>
  fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ email: "ana@example.com", password }),
  })

const me = (token: string) => fetch(`${base}/auth/me`, { headers: { authorization: `Bearer ${token}` } })

const sessionFor = (user: { _id: unknown; email: string }, issuedAt?: number) =>
  signAuthToken({ sub: String(user._id), email: user.email, role: "user", ...(issuedAt === undefined ? {} : { issuedAt }) })

test("a new Google account is created with no password and the user role", async () => {
  const { user, action } = await signInWithGoogleProfile(profile())
  assert.equal(action, "create")
  assert.equal(user.role, "user")
  assert.equal(user.googleId, "g-ana")
  const stored = await User.findById(user._id).select("+passwordHash")
  assert.equal(stored?.passwordHash, undefined)
})

test("a returning Google account signs in and nothing about it changes", async () => {
  const first = await signInWithGoogleProfile(profile())
  const again = await signInWithGoogleProfile(profile())
  assert.equal(again.action, "login")
  assert.equal(String(again.user._id), String(first.user._id))
  assert.equal((await User.findById(first.user._id))?.passwordChangedAt, undefined)
})

test("linking Google to an account that has a password removes that password", async () => {
  const account = await createPasswordAccount()

  const { user, action } = await signInWithGoogleProfile(profile())

  assert.equal(action, "link")
  assert.equal(String(user._id), String(account._id), "it is the same account")
  const stored = await User.findById(account._id).select("+passwordHash")
  assert.equal(stored?.googleId, "g-ana")
  assert.equal(stored?.passwordHash, undefined, "the password is gone")
  assert.ok(stored?.passwordChangedAt, "and the moment is recorded")

  const attempt = await login(ATTACKER_PASSWORD, "10.3.0.1")
  assert.equal(attempt.status, 401)
  assert.match((await attempt.json()).error, /Google/)
})

test("linking ends every session that began before it, and a session started afterwards works", async () => {
  const account = await createPasswordAccount()
  const earlier = sessionFor(account, Date.now() - 60_000)
  assert.equal((await me(earlier)).status, 200)

  await signInWithGoogleProfile(profile())

  assert.equal((await me(earlier)).status, 401, "whoever was signed in before is out")
  assert.equal((await me(sessionFor(account))).status, 200, "a session issued after the link works")
})

test("a reset link sent before the account was linked is dropped too", async () => {
  const account = await createPasswordAccount()
  const { tokenHash } = generateResetToken()
  await PasswordResetToken.create({ userId: account._id, tokenHash, expiresAt: new Date(Date.now() + 3600_000) })

  await signInWithGoogleProfile(profile())

  assert.equal(await PasswordResetToken.countDocuments({ userId: account._id }), 0)
})

test("an email Google has not verified links nothing and changes nothing", async () => {
  const account = await createPasswordAccount()

  await assert.rejects(signInWithGoogleProfile(profile({ emailVerified: false })), /not verified/)

  const stored = await User.findById(account._id).select("+passwordHash")
  assert.ok(stored?.passwordHash, "the password is still there")
  assert.equal(stored?.googleId, undefined)
  assert.equal(stored?.passwordChangedAt, undefined)
  assert.equal((await login(ATTACKER_PASSWORD, "10.3.0.2")).status, 200)
})

test("an email already linked to a different Google account is refused and left alone", async () => {
  await User.create({ name: "Ana", email: "ana@example.com", googleId: "g-someone-else" })

  await assert.rejects(signInWithGoogleProfile(profile()), /different Google account/)

  const stored = await User.findOne({ email: "ana@example.com" })
  assert.equal(stored?.googleId, "g-someone-else")
  assert.equal(stored?.passwordChangedAt, undefined)
})

test("pre-registration takeover: the first person's password and session stop working once the real owner signs in with Google", async () => {
  // Someone registers with an address that is not theirs, and stays signed in.
  const squatted = await createPasswordAccount()
  const squatterSession = sessionFor(squatted, Date.now() - 1_000)
  assert.equal((await me(squatterSession)).status, 200)

  // The real owner signs in with Google.
  const { user } = await signInWithGoogleProfile(profile())

  assert.equal((await login(ATTACKER_PASSWORD, "10.3.0.3")).status, 401)
  assert.equal((await me(squatterSession)).status, 401)
  assert.equal((await me(sessionFor(user))).status, 200, "the owner is in")
})
