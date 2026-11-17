import test, { afterEach, beforeEach } from "node:test"
import assert from "node:assert/strict"
import mongoose from "mongoose"
import type { NextFunction, Request, Response } from "express"

import { env } from "../src/config/env"
import { requireAuth, optionalAuth } from "../src/middleware/auth.middleware"
import { User } from "../src/models/User.model"
import { ApiError } from "../src/utils/ApiError"
import { signAuthToken, verifyAuthToken } from "../src/utils/jwt"

interface FakeUser {
  _id: string
  tokenVersion: number
}

let simulatedDbUsers: Map<string, FakeUser>
const originalFindById = User.findById

function mockFindById(id: unknown) {
  const user = simulatedDbUsers.get(String(id))
  return {
    select: (field: string) => {
      if (field === "tokenVersion") {
        return Promise.resolve(user ? { _id: user._id, tokenVersion: user.tokenVersion } : null)
      }
      return Promise.resolve(user ? { ...user } : null)
    },
  } as unknown as ReturnType<typeof User.findById>
}

beforeEach(() => {
  simulatedDbUsers = new Map()
  Object.defineProperty(mongoose.connection, "readyState", { value: 1, configurable: true })
  User.findById = mockFindById as unknown as typeof User.findById
})

afterEach(() => {
  Object.defineProperty(mongoose.connection, "readyState", { value: 0, configurable: true })
  User.findById = originalFindById
})

function runAsync(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  request: { cookie?: string; bearer?: string } = {}
): Promise<{ req: Request; nextArg: unknown }> {
  return new Promise((resolve) => {
    const req = {
      cookies: request.cookie ? { [env.authCookieName]: request.cookie } : {},
      headers: request.bearer ? { authorization: `Bearer ${request.bearer}` } : {},
    } as unknown as Request
    const res = {
      setHeader: () => {},
      cookie: () => {},
    } as unknown as Response

    middleware(req, res, (arg?: unknown) => {
      resolve({ req, nextArg: arg })
    })
  })
}

test("User schema default tokenVersion is 0", () => {
  const schemaPath = User.schema.path("tokenVersion") as mongoose.SchemaType & {
    instance?: string
    defaultValue?: unknown
  }
  assert.ok(schemaPath, "tokenVersion field must exist on User schema")
  assert.equal(schemaPath.instance, "Number")
  assert.equal(schemaPath.defaultValue, 0)
})

test("signAuthToken includes tokenVersion in the JWT payload", () => {
  const tokenV0 = signAuthToken({ sub: "u1", email: "user@example.com", role: "user" })
  const decodedV0 = verifyAuthToken(tokenV0)
  assert.equal(decodedV0.tokenVersion, 0)

  const tokenV5 = signAuthToken({ sub: "u1", email: "user@example.com", role: "user", tokenVersion: 5 })
  const decodedV5 = verifyAuthToken(tokenV5)
  assert.equal(decodedV5.tokenVersion, 5)
})

test("requireAuth permits access when tokenVersion matches user's tokenVersion in DB", async () => {
  simulatedDbUsers.set("u1", { _id: "u1", tokenVersion: 0 })

  const token = signAuthToken({ sub: "u1", email: "user@example.com", role: "user", tokenVersion: 0 })
  const { req, nextArg } = await runAsync(requireAuth, { bearer: token })

  assert.equal(nextArg, undefined, "Expected next() with no error")
  assert.equal(req.user?.sub, "u1")
  assert.equal(req.user?.tokenVersion, 0)
})

test("requireAuth rejects token with 401 'Session has been revoked' when tokenVersion is outdated", async () => {
  // User has tokenVersion 1 in database (e.g. after password change or company suspension)
  simulatedDbUsers.set("u1", { _id: "u1", tokenVersion: 1 })

  // Client presents older token with tokenVersion 0
  const oldToken = signAuthToken({ sub: "u1", email: "user@example.com", role: "user", tokenVersion: 0 })
  const { req, nextArg } = await runAsync(requireAuth, { bearer: oldToken })

  assert.ok(nextArg instanceof ApiError, "Expected ApiError")
  const err = nextArg as InstanceType<typeof ApiError>
  assert.equal(err.status, 401)
  assert.equal(err.message, "Session has been revoked")
  assert.equal(req.user, undefined)
})

test("incrementing tokenVersion immediately invalidates previously issued JWTs while allowing new ones", async () => {
  const user: FakeUser = { _id: "u100", tokenVersion: 0 }
  simulatedDbUsers.set("u100", user)

  // 1. Initial login on Device A and Device B
  const tokenDeviceA = signAuthToken({ sub: "u100", email: "a@x.co", role: "user", tokenVersion: 0 })
  const tokenDeviceB = signAuthToken({ sub: "u100", email: "a@x.co", role: "user", tokenVersion: 0 })

  // Both devices can authenticate
  const initialA = await runAsync(requireAuth, { bearer: tokenDeviceA })
  assert.equal(initialA.nextArg, undefined)
  const initialB = await runAsync(requireAuth, { bearer: tokenDeviceB })
  assert.equal(initialB.nextArg, undefined)

  // 2. Action happens (e.g. password changed or company suspended): tokenVersion is incremented in DB
  user.tokenVersion += 1

  // 3. Device A and Device B old tokens are now immediately revoked
  const revokedA = await runAsync(requireAuth, { bearer: tokenDeviceA })
  assert.ok(revokedA.nextArg instanceof ApiError)
  assert.equal((revokedA.nextArg as InstanceType<typeof ApiError>).status, 401)
  assert.equal((revokedA.nextArg as InstanceType<typeof ApiError>).message, "Session has been revoked")

  const revokedB = await runAsync(requireAuth, { bearer: tokenDeviceB })
  assert.ok(revokedB.nextArg instanceof ApiError)
  assert.equal((revokedB.nextArg as InstanceType<typeof ApiError>).status, 401)
  assert.equal((revokedB.nextArg as InstanceType<typeof ApiError>).message, "Session has been revoked")

  // 4. Re-authenticating / new token issued with updated tokenVersion succeeds
  const newToken = signAuthToken({ sub: "u100", email: "a@x.co", role: "user", tokenVersion: user.tokenVersion })
  const allowedNew = await runAsync(requireAuth, { bearer: newToken })
  assert.equal(allowedNew.nextArg, undefined)
  assert.equal(allowedNew.req.user?.tokenVersion, 1)
})

test("requireAuth rejects token when user no longer exists in DB", async () => {
  // DB is empty for user u-deleted
  const token = signAuthToken({ sub: "u-deleted", email: "deleted@x.co", role: "user", tokenVersion: 0 })
  const { nextArg } = await runAsync(requireAuth, { bearer: token })

  assert.ok(nextArg instanceof ApiError)
  assert.equal((nextArg as InstanceType<typeof ApiError>).status, 401)
  assert.equal((nextArg as InstanceType<typeof ApiError>).message, "Session has been revoked")
})

test("optionalAuth ignores token with outdated tokenVersion", async () => {
  simulatedDbUsers.set("u1", { _id: "u1", tokenVersion: 2 })

  const outdatedToken = signAuthToken({ sub: "u1", email: "user@example.com", role: "user", tokenVersion: 1 })
  const { req, nextArg } = await runAsync(optionalAuth, { bearer: outdatedToken })

  assert.equal(nextArg, undefined)
  assert.equal(req.user, undefined)

  const activeToken = signAuthToken({ sub: "u1", email: "user@example.com", role: "user", tokenVersion: 2 })
  const { req: activeReq } = await runAsync(optionalAuth, { bearer: activeToken })
  assert.equal(activeReq.user?.sub, "u1")
})
