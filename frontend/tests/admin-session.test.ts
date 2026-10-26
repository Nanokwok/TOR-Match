import test from "node:test"
import assert from "node:assert/strict"

import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  adminSessionCookieOptions,
  decodeAdminSession,
  encodeAdminSession,
  touchAdminSession,
  type AdminSession,
} from "../src/lib/admin-session"

const session = (overrides: Partial<AdminSession> = {}): AdminSession => ({
  email: "admin@x.co",
  name: "Admin",
  issuedAt: Date.now(),
  lastActiveAt: Date.now(),
  ...overrides,
})

test("an encoded session decodes back to the same session", async () => {
  const original = session()
  assert.deepEqual(await decodeAdminSession(await encodeAdminSession(original)), original)
})

test("no token, or one that is not in payload.signature form, is no session", async () => {
  assert.equal(await decodeAdminSession(undefined), null)
  assert.equal(await decodeAdminSession(null), null)
  assert.equal(await decodeAdminSession(""), null)
  assert.equal(await decodeAdminSession("nodot"), null)
  assert.equal(await decodeAdminSession("a."), null)
})

test("editing the payload invalidates the signature", async () => {
  const [, signature] = (await encodeAdminSession(session())).split(".")
  const forgedPayload = Buffer.from(JSON.stringify(session({ email: "attacker@x.co" }))).toString("base64url")
  assert.equal(await decodeAdminSession(`${forgedPayload}.${signature}`), null)
})

test("a wrong signature is refused, including one of a different length", async () => {
  const [payload] = (await encodeAdminSession(session())).split(".")
  assert.equal(await decodeAdminSession(`${payload}.AAAA`), null)
  assert.equal(await decodeAdminSession(`${payload}.${"A".repeat(43)}`), null)
})

test("a session idle for longer than the timeout is refused, one just inside it is kept", async () => {
  const limit = ADMIN_SESSION_MAX_AGE_SECONDS * 1000
  const stale = await encodeAdminSession(session({ lastActiveAt: Date.now() - limit - 5_000 }))
  assert.equal(await decodeAdminSession(stale), null)

  const fresh = await encodeAdminSession(session({ lastActiveAt: Date.now() - limit + 60_000 }))
  assert.notEqual(await decodeAdminSession(fresh), null)
})

test("a correctly signed payload of the wrong shape is refused", async () => {
  const malformed = await encodeAdminSession({ email: 1, name: "x" } as unknown as AdminSession)
  assert.equal(await decodeAdminSession(malformed), null)
})

test("touching a session moves its last activity forward and changes nothing else", () => {
  const old = session({ lastActiveAt: 1_000 })
  const touched = touchAdminSession(old)
  assert.ok(touched.lastActiveAt > old.lastActiveAt)
  assert.equal(touched.email, old.email)
  assert.equal(touched.issuedAt, old.issuedAt)
})

test("the cookie is httpOnly, strict and limited to /admin", () => {
  const options = adminSessionCookieOptions()
  assert.equal(options.httpOnly, true)
  assert.equal(options.sameSite, "strict")
  assert.equal(options.path, "/admin")
  assert.equal(options.maxAge, ADMIN_SESSION_MAX_AGE_SECONDS)
})
