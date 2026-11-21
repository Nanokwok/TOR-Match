import test from "node:test"
import assert from "node:assert/strict"
import type { Request, Response } from "express"

import { createErrorMiddleware } from "../src/middleware/error.middleware"
import { ApiError } from "../src/utils/ApiError"

/** Runs the handler against a fake response and returns what it sent. */
function run(production: boolean, err: unknown) {
  let status = 0
  let body: Record<string, unknown> = {}
  const res = {
    status(code: number) {
      status = code
      return this
    },
    json(payload: Record<string, unknown>) {
      body = payload
      return this
    },
  } as unknown as Response

  const log = console.error
  console.error = () => undefined
  try {
    createErrorMiddleware(production)(err, {} as Request, res, () => undefined)
  } finally {
    console.error = log
  }
  return { status, body }
}

const fieldErrors = { fieldErrors: { password: ["Password must be at least 8 characters"] } }

test("in production a 400 does not carry the validator's field report", () => {
  const { status, body } = run(true, ApiError.badRequest("Invalid input", fieldErrors))

  assert.equal(status, 400)
  assert.equal(body.error, "Invalid input")
  assert.equal(body.details, undefined)
})

test("outside production a 400 keeps its details for the developer", () => {
  const { body } = run(false, ApiError.badRequest("Invalid input", fieldErrors))

  assert.deepEqual(body.details, fieldErrors)
})

test("in production other statuses keep the details meant for the caller, such as when to retry", () => {
  const { status, body } = run(true, ApiError.tooManyRequests(undefined, { limit: 100, retryAfterSeconds: 60 }))

  assert.equal(status, 429)
  assert.deepEqual(body.details, { limit: 100, retryAfterSeconds: 60 })
})

test("an unexpected error is a generic 500 in production and says more outside it", () => {
  const production = run(true, new Error("connect ECONNREFUSED 10.0.0.5:27017"))
  assert.equal(production.status, 500)
  assert.deepEqual(production.body, { error: "Internal server error" })

  const development = run(false, new Error("connect ECONNREFUSED 10.0.0.5:27017"))
  assert.equal(development.body.detail, "connect ECONNREFUSED 10.0.0.5:27017")
})
