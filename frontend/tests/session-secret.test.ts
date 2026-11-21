import test from "node:test"
import assert from "node:assert/strict"

import { decodeAdminSession, encodeAdminSession, type AdminSession } from "../src/lib/admin-session"
import { decodeUserSession, encodeUserSession, type UserSession } from "../src/lib/user-session"

const env = process.env as Record<string, string | undefined>
const KEYS = ["NODE_ENV", "ADMIN_SESSION_SECRET", "USER_SESSION_SECRET", "JWT_SECRET"] as const

/** Runs `fn` with only the given variables set, then puts the real ones back. */
async function withEnv(values: Partial<Record<(typeof KEYS)[number], string>>, fn: () => Promise<void>) {
  const saved = Object.fromEntries(KEYS.map((key) => [key, env[key]]))
  for (const key of KEYS) delete env[key]
  Object.assign(env, values)
  const log = console.error
  console.error = () => undefined
  try {
    await fn()
  } finally {
    console.error = log
    for (const key of KEYS) {
      if (saved[key] === undefined) delete env[key]
      else env[key] = saved[key]
    }
  }
}

const admin: AdminSession = { email: "a@x.co", name: "A", issuedAt: Date.now(), lastActiveAt: Date.now() }
const user: UserSession = { userId: "u1", email: "u@x.co", role: "user", issuedAt: Date.now(), lastActiveAt: Date.now() }

test("production without ADMIN_SESSION_SECRET: no admin session can be signed, and none is accepted", async () => {
  let cookieFromDevelopmentSecret = ""
  await withEnv({ NODE_ENV: "development" }, async () => {
    cookieFromDevelopmentSecret = await encodeAdminSession(admin)
  })

  await withEnv({ NODE_ENV: "production" }, async () => {
    await assert.rejects(encodeAdminSession(admin), /ADMIN_SESSION_SECRET must be set in production/)
    // A cookie signed with the public development secret must not be accepted.
    assert.equal(await decodeAdminSession(cookieFromDevelopmentSecret), null)
  })
})

test("production with ADMIN_SESSION_SECRET works as before", async () => {
  await withEnv({ NODE_ENV: "production", ADMIN_SESSION_SECRET: "a-long-random-production-secret" }, async () => {
    assert.deepEqual(await decodeAdminSession(await encodeAdminSession(admin)), admin)
  })
})

test("production without any user session secret: no user session can be signed, and none is accepted", async () => {
  let cookieFromDevelopmentSecret = ""
  await withEnv({ NODE_ENV: "development" }, async () => {
    cookieFromDevelopmentSecret = await encodeUserSession(user)
  })

  await withEnv({ NODE_ENV: "production" }, async () => {
    await assert.rejects(encodeUserSession(user), /USER_SESSION_SECRET must be set in production/)
    assert.equal(await decodeUserSession(cookieFromDevelopmentSecret), null)
  })
})

test("production: JWT_SECRET is enough for the user session, as before", async () => {
  await withEnv({ NODE_ENV: "production", JWT_SECRET: "a-long-random-production-secret" }, async () => {
    assert.deepEqual(await decodeUserSession(await encodeUserSession(user)), user)
  })
})

test("outside production the development fallback still works", async () => {
  await withEnv({ NODE_ENV: "development" }, async () => {
    assert.deepEqual(await decodeAdminSession(await encodeAdminSession(admin)), admin)
    assert.deepEqual(await decodeUserSession(await encodeUserSession(user)), user)
  })
})
