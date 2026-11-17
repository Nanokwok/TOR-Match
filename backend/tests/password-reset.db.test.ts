import test, { after, afterEach, before, mock } from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"
import bcrypt from "bcryptjs"

import { createApp } from "../src/app"
import { PASSWORD_RESET_COOLDOWN_MS, PASSWORD_RESET_TTL_MS, hashResetToken } from "../src/domain/password-reset"
import { PasswordResetToken } from "../src/models/PasswordResetToken.model"
import { User } from "../src/models/User.model"
import {
  INVALID_RESET_LINK_MESSAGE,
  requestPasswordReset,
  resetPassword,
  type PasswordResetDeps,
} from "../src/services/password-reset.service"
import { PWNED_PASSWORD_ERROR_MESSAGE } from "../src/services/pwned-password.service"
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

/** A mail "server" that keeps what it was asked to send. */
function outbox() {
  const sent: { to: string; subject: string; text: string; html: string }[] = []
  const send: NonNullable<PasswordResetDeps["send"]> = async (message) => {
    sent.push(message)
    return true
  }
  return { sent, send }
}

const tokenIn = (mail: { text: string }) => {
  const match = mail.text.match(/forgot-password\?token=([A-Za-z0-9_-]+)/)
  assert.ok(match, "the email contains a reset link")
  return match[1]
}

const notPwned = async () => false

async function rejection(promise: Promise<unknown>) {
  return promise.then(
    () => assert.fail("expected it to be rejected"),
    (error: unknown) => error as ApiError
  )
}

test("an account with a password is sent a link that is stored only as a hash", async () => {
  await createAna()
  const { sent, send } = outbox()
  const now = new Date("2026-03-01T10:00:00Z")

  await requestPasswordReset("ana@example.com", { send, now: () => now })

  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, "ana@example.com")
  const token = tokenIn(sent[0])

  const stored = await PasswordResetToken.find()
  assert.equal(stored.length, 1)
  assert.equal(stored[0].tokenHash, hashResetToken(token))
  assert.ok(!JSON.stringify(stored[0].toObject()).includes(token), "the token itself is nowhere in the database")
  assert.equal(stored[0].expiresAt.getTime(), now.getTime() + PASSWORD_RESET_TTL_MS)
})

test("the address is matched without regard to case or surrounding spaces", async () => {
  await createAna()
  const { sent, send } = outbox()
  await requestPasswordReset("  ANA@Example.com ", { send })
  assert.equal(sent.length, 1)
})

test("an address with no account gets no email and no token, and no error", async () => {
  const { sent, send } = outbox()
  await requestPasswordReset("nobody@example.com", { send })
  assert.equal(sent.length, 0)
  assert.equal(await PasswordResetToken.countDocuments(), 0)
})

test("a Google-only account has no password to reset, so nothing is sent", async () => {
  await createAna({ passwordHash: undefined, googleId: "g-1" })
  const { sent, send } = outbox()
  await requestPasswordReset("ana@example.com", { send })
  assert.equal(sent.length, 0)
  assert.equal(await PasswordResetToken.countDocuments(), 0)
})

test("asking again within a minute sends nothing; after that a new link replaces the old one", async () => {
  await createAna()
  const { sent, send } = outbox()
  const t0 = new Date("2026-03-01T10:00:00Z")

  await requestPasswordReset("ana@example.com", { send, now: () => t0 })
  await requestPasswordReset("ana@example.com", { send, now: () => new Date(t0.getTime() + 5_000) })
  assert.equal(sent.length, 1, "the second request is ignored")

  await requestPasswordReset("ana@example.com", { send, now: () => new Date(t0.getTime() + PASSWORD_RESET_COOLDOWN_MS + 1) })
  assert.equal(sent.length, 2)
  assert.equal(await PasswordResetToken.countDocuments(), 1, "one live link per account")

  // The links were stored at the injected times, so check them at a matching time too.
  const soon = () => new Date(t0.getTime() + PASSWORD_RESET_COOLDOWN_MS + 2_000)
  const stale = await rejection(resetPassword(tokenIn(sent[0]), NEW_PASSWORD, { isPwned: notPwned, now: soon }))
  assert.equal(stale.message, INVALID_RESET_LINK_MESSAGE)
  await resetPassword(tokenIn(sent[1]), NEW_PASSWORD, { isPwned: notPwned, now: soon })
})

test("if the email cannot be sent, the link is dropped so the user can ask again at once", async () => {
  await createAna()
  const failing: NonNullable<PasswordResetDeps["send"]> = async () => {
    throw new Error("SMTP down")
  }
  await assert.rejects(requestPasswordReset("ana@example.com", { send: failing }), /SMTP down/)
  assert.equal(await PasswordResetToken.countDocuments(), 0)

  const { sent, send } = outbox()
  await requestPasswordReset("ana@example.com", { send })
  assert.equal(sent.length, 1)
})

test("a valid link sets the new password, which then works and the old one does not", async () => {
  const ana = await createAna()
  const { sent, send } = outbox()
  await requestPasswordReset("ana@example.com", { send })

  await resetPassword(tokenIn(sent[0]), NEW_PASSWORD, { isPwned: notPwned })

  const stored = await User.findById(ana._id).select("+passwordHash")
  assert.ok(stored?.passwordHash)
  assert.equal(await bcrypt.compare(NEW_PASSWORD, stored.passwordHash), true)
  assert.equal(await bcrypt.compare(OLD_PASSWORD, stored.passwordHash), false)
  assert.equal(await PasswordResetToken.countDocuments(), 0, "the link is spent")
})

test("a link works only once", async () => {
  await createAna()
  const { sent, send } = outbox()
  await requestPasswordReset("ana@example.com", { send })
  const token = tokenIn(sent[0])

  await resetPassword(token, NEW_PASSWORD, { isPwned: notPwned })
  const again = await rejection(resetPassword(token, "another password 123", { isPwned: notPwned }))
  assert.equal(again.status, 400)
  assert.equal(again.message, INVALID_RESET_LINK_MESSAGE)
})

test("two requests with the same link at the same moment: one wins, the other is refused", async () => {
  await createAna()
  const { sent, send } = outbox()
  await requestPasswordReset("ana@example.com", { send })
  const token = tokenIn(sent[0])

  const results = await Promise.allSettled([
    resetPassword(token, "first password 123", { isPwned: notPwned }),
    resetPassword(token, "second password 123", { isPwned: notPwned }),
  ])
  assert.deepEqual(results.map((r) => r.status).sort(), ["fulfilled", "rejected"])
})

test("an expired link is refused and the password stays as it was", async () => {
  const ana = await createAna()
  const { sent, send } = outbox()
  await requestPasswordReset("ana@example.com", { send })
  const later = () => new Date(Date.now() + PASSWORD_RESET_TTL_MS + 1000)

  const error = await rejection(resetPassword(tokenIn(sent[0]), NEW_PASSWORD, { isPwned: notPwned, now: later }))
  assert.equal(error.message, INVALID_RESET_LINK_MESSAGE)

  const stored = await User.findById(ana._id).select("+passwordHash")
  assert.equal(await bcrypt.compare(OLD_PASSWORD, stored!.passwordHash!), true)
})

test("a made-up or empty token is refused", async () => {
  await createAna()
  for (const token of ["not-a-real-token-at-all-0123456789", "x"]) {
    const error = await rejection(resetPassword(token, NEW_PASSWORD, { isPwned: notPwned }))
    assert.equal(error.status, 400)
    assert.equal(error.message, INVALID_RESET_LINK_MESSAGE)
  }
})

test("a password found in a data breach is refused, and the same link can be used again with a better one", async () => {
  await createAna()
  const { sent, send } = outbox()
  await requestPasswordReset("ana@example.com", { send })
  const token = tokenIn(sent[0])

  const refused = await rejection(resetPassword(token, "password123", { isPwned: async () => true }))
  assert.equal(refused.message, PWNED_PASSWORD_ERROR_MESSAGE)
  assert.equal(await PasswordResetToken.countDocuments(), 1, "the link was not used up")

  await resetPassword(token, NEW_PASSWORD, { isPwned: notPwned })
})

// --- over HTTP ---------------------------------------------------------------

const post = (path: string, body: unknown, ip: string) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  })

test("POST /auth/forgot-password answers the same for a known and an unknown address", async () => {
  mock.method(console, "warn", () => {}) // no SMTP in tests: the dev link is logged
  await createAna()

  const known = await post("/auth/forgot-password", { email: "ana@example.com" }, "10.1.0.1")
  const unknown = await post("/auth/forgot-password", { email: "nobody@example.com" }, "10.1.0.1")

  assert.equal(known.status, 200)
  assert.equal(unknown.status, 200)
  assert.deepEqual(await known.json(), { ok: true })
  assert.deepEqual(await unknown.json(), { ok: true })
})

test("POST /auth/forgot-password rejects something that is not an email", async () => {
  const response = await post("/auth/forgot-password", { email: "not-an-email" }, "10.1.0.2")
  assert.equal(response.status, 400)
})

test("POST /auth/forgot-password is limited to 5 a quarter hour per address of the visitor", async () => {
  for (let i = 0; i < 5; i++) {
    assert.equal((await post("/auth/forgot-password", { email: "nobody@example.com" }, "10.1.0.3")).status, 200)
  }
  const blocked = await post("/auth/forgot-password", { email: "nobody@example.com" }, "10.1.0.3")
  assert.equal(blocked.status, 429)
  assert.match((await blocked.json()).error, /password reset/i)
  assert.equal((await post("/auth/forgot-password", { email: "nobody@example.com" }, "10.1.0.4")).status, 200)
})

test("POST /auth/reset-password changes the password and the user can then log in with it", async () => {
  await createAna()
  const { sent, send } = outbox()
  await requestPasswordReset("ana@example.com", { send })

  const reset = await post("/auth/reset-password", { token: tokenIn(sent[0]), password: NEW_PASSWORD }, "10.1.0.5")
  assert.equal(reset.status, 200)

  const oldLogin = await post("/auth/login", { email: "ana@example.com", password: OLD_PASSWORD }, "10.1.0.5")
  assert.equal(oldLogin.status, 401)
  const newLogin = await post("/auth/login", { email: "ana@example.com", password: NEW_PASSWORD }, "10.1.0.5")
  assert.equal(newLogin.status, 200)
})

test("POST /auth/reset-password gives 400 for a bad link and for a short password", async () => {
  const badLink = await post("/auth/reset-password", { token: "x".repeat(43), password: NEW_PASSWORD }, "10.1.0.6")
  assert.equal(badLink.status, 400)
  assert.equal((await badLink.json()).error, INVALID_RESET_LINK_MESSAGE)

  const short = await post("/auth/reset-password", { token: "x".repeat(43), password: "short" }, "10.1.0.6")
  assert.equal(short.status, 400)

  const noToken = await post("/auth/reset-password", { password: NEW_PASSWORD }, "10.1.0.6")
  assert.equal(noToken.status, 400)
})
