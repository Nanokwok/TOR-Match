import test from "node:test"
import assert from "node:assert/strict"

import { decodeUserSession, encodeUserSession, type UserSession } from "../src/lib/user-session"

const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url")

const session: UserSession = { userId: "u1", email: "u@x.co", role: "user", issuedAt: Date.now(), lastActiveAt: Date.now() }

test("a session cookie this app signed is accepted", async () => {
  assert.deepEqual(await decodeUserSession(await encodeUserSession(session)), session)
})

test("an unsigned JWT-shaped value is not a session, whatever it claims", async () => {
  // Three parts, an admin role and fresh timestamps, but no signature anyone checked.
  const forged = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
    sub: "u1",
    email: "u@x.co",
    role: "admin",
    issuedAt: Date.now(),
    lastActiveAt: Date.now(),
  })}.not-a-real-signature`
  assert.equal(await decodeUserSession(forged), null)
})

test("a session cookie with a wrong signature is refused", async () => {
  const [payload] = (await encodeUserSession(session)).split(".")
  assert.equal(await decodeUserSession(`${payload}.AAAA`), null)
})
