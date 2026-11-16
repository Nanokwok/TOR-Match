import test from "node:test"
import assert from "node:assert/strict"
import jwt from "jsonwebtoken"
import type { NextFunction, Request, Response } from "express"

import { env } from "../src/config/env"
import { optionalAuth, requireAuth, requireRole } from "../src/middleware/auth.middleware"
import { ApiError } from "../src/utils/ApiError"
import { signAuthToken, verifyAuthToken } from "../src/utils/jwt"

const user = { sub: "u1", email: "a@x.co", role: "user" as const }
const admin = { sub: "u2", email: "b@x.co", role: "admin" as const }

/** Runs a middleware against a fake request and returns what it passed to next(). */
function run(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  request: { cookie?: string; bearer?: string; user?: typeof user | typeof admin } = {}
) {
  const req = {
    cookies: request.cookie ? { [env.authCookieName]: request.cookie } : {},
    headers: request.bearer ? { authorization: `Bearer ${request.bearer}` } : {},
    user: request.user,
  } as unknown as Request
  let nextArg: unknown = "not-called"
  middleware(req, {} as Response, ((arg?: unknown) => {
    nextArg = arg
  }) as NextFunction)
  return { req, nextArg }
}

test("a signed token verifies and carries who the user is", () => {
  const payload = verifyAuthToken(signAuthToken(user))
  assert.equal(payload.sub, "u1")
  assert.equal(payload.email, "a@x.co")
  assert.equal(payload.role, "user")
})

test("a token signed with another secret is rejected", () => {
  const forged = jwt.sign(admin, "some-other-secret")
  assert.throws(() => verifyAuthToken(forged))
})

test("a tampered token is rejected", () => {
  const [header, , signature] = signAuthToken(user).split(".")
  const swapped = Buffer.from(JSON.stringify({ ...admin, iat: 1, exp: 9_999_999_999 })).toString("base64url")
  assert.throws(() => verifyAuthToken(`${header}.${swapped}.${signature}`))
})

test("an expired token is rejected", () => {
  const expired = jwt.sign(user, env.jwtSecret, { expiresIn: -10 })
  assert.throws(() => verifyAuthToken(expired), /expired/i)
})

test("requireAuth refuses a request with no token", () => {
  const { nextArg } = run(requireAuth)
  assert.ok(nextArg instanceof ApiError)
  assert.equal((nextArg as InstanceType<typeof ApiError>).status, 401)
})

test("requireAuth accepts the token from the session cookie and from a bearer header", () => {
  const token = signAuthToken(user)
  const fromCookie = run(requireAuth, { cookie: token })
  assert.equal(fromCookie.nextArg, undefined)
  assert.equal(fromCookie.req.user?.sub, "u1")

  const fromHeader = run(requireAuth, { bearer: token })
  assert.equal(fromHeader.nextArg, undefined)
  assert.equal(fromHeader.req.user?.email, "a@x.co")
})

test("requireAuth refuses a token that does not verify", () => {
  const { nextArg, req } = run(requireAuth, { cookie: jwt.sign(user, "wrong-secret") })
  assert.equal((nextArg as InstanceType<typeof ApiError>).status, 401)
  assert.equal(req.user, undefined)
})

test("optionalAuth never blocks: it attaches a good token and ignores a bad or missing one", () => {
  const good = run(optionalAuth, { cookie: signAuthToken(user) })
  assert.equal(good.nextArg, undefined)
  assert.equal(good.req.user?.sub, "u1")

  const bad = run(optionalAuth, { cookie: "garbage" })
  assert.equal(bad.nextArg, undefined)
  assert.equal(bad.req.user, undefined)

  assert.equal(run(optionalAuth).nextArg, undefined)
})

test("requireRole turns away a signed-out visitor with 401 and the wrong role with 403", () => {
  const guard = requireRole("admin")
  assert.equal((run(guard).nextArg as InstanceType<typeof ApiError>).status, 401)
  assert.equal((run(guard, { user }).nextArg as InstanceType<typeof ApiError>).status, 403)
})

test("requireRole lets the right role through, and several roles can be allowed", () => {
  assert.equal(run(requireRole("admin"), { user: admin }).nextArg, undefined)
  assert.equal(run(requireRole("user", "admin"), { user }).nextArg, undefined)
})
