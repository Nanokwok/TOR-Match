import test from "node:test"
import assert from "node:assert/strict"
import jwt from "jsonwebtoken"

import { env, hostCookieName } from "../src/config/env"
import { JWT_ALGORITHM, signAuthToken, verifyAuthToken } from "../src/utils/jwt"

const payload = { sub: "u1", email: "a@x.co", role: "user" as const }

test("tokens are signed with HS256 and verify", () => {
  const token = signAuthToken(payload)
  assert.equal(jwt.decode(token, { complete: true })?.header.alg, JWT_ALGORITHM)
  assert.equal(verifyAuthToken(token).sub, "u1")
})

test("a token signed with another HMAC algorithm is refused, even with the right secret", () => {
  const token = jwt.sign(payload, env.jwtSecret, { algorithm: "HS512", expiresIn: "1h" })
  assert.throws(() => verifyAuthToken(token), /invalid algorithm/)
})

test("an unsigned token (alg none) is refused", () => {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")
  const body = Buffer.from(JSON.stringify({ ...payload, role: "admin" })).toString("base64url")
  assert.throws(() => verifyAuthToken(`${header}.${body}.`))
})

test("cookie names get the __Host- prefix in production only", () => {
  assert.equal(hostCookieName("tm_token", true), "__Host-tm_token")
  assert.equal(hostCookieName("tm_token", false), "tm_token")
  // A name that already carries a prefix is not prefixed twice.
  assert.equal(hostCookieName("__Host-tm_token", true), "__Host-tm_token")
  assert.equal(hostCookieName("__Secure-x", true), "__Secure-x")
})
