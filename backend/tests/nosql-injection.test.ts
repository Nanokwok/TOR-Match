import test from "node:test"
import assert from "node:assert/strict"
import type { Request } from "express"

import { findUnsafeKey, rejectMongoOperators } from "../src/middleware/reject-operators.middleware"
import { MAX_PASSWORD_BYTES, newPasswordSchema } from "../src/validation/password"

test("plain values and ordinary nested data have no unsafe key", () => {
  assert.equal(findUnsafeKey(undefined), null)
  assert.equal(findUnsafeKey("a string"), null)
  assert.equal(findUnsafeKey({ status: "open", tags: ["a", "b"], nested: { label: "x", done: true } }), null)
  assert.equal(findUnsafeKey([{ label: "x" }, { label: "y" }]), null)
})

test("an operator key is found at any depth, in objects and in arrays", () => {
  assert.equal(findUnsafeKey({ status: { $ne: "x" } }), "$ne")
  assert.equal(findUnsafeKey({ $where: "1" }), "$where")
  assert.equal(findUnsafeKey({ a: { b: [{ c: { $gt: "" } }] } }), "$gt")
})

test("a dotted key (a path into a document) is found", () => {
  assert.equal(findUnsafeKey({ "profile.role": "admin" }), "profile.role")
})

test("__proto__ as an own key is found", () => {
  assert.equal(findUnsafeKey(JSON.parse('{"a":{"__proto__":{"admin":true}}}')), "__proto__")
})

test("a payload nested deeper than any real one is refused rather than walked", () => {
  let deep: Record<string, unknown> = { leaf: 1 }
  for (let i = 0; i < 50; i++) deep = { next: deep }
  assert.ok(findUnsafeKey(deep))
})

function run(parts: { body?: unknown; query?: unknown }) {
  let result: unknown = "not called"
  rejectMongoOperators({ body: parts.body, query: parts.query ?? {} } as Request, {} as never, (error?: unknown) => {
    result = error
  })
  return result as { status?: number } | undefined
}

test("the middleware passes a clean request on and answers 400 to one with an operator", () => {
  assert.equal(run({ body: { email: "a@b.co" }, query: { status: "open" } }), undefined)
  assert.equal(run({ body: { email: { $gt: "" } } })?.status, 400)
  assert.equal(run({ query: { status: { $ne: "open" } } })?.status, 400)
})

test("a password may be as long as bcrypt can use, counted in bytes, and no longer", () => {
  assert.equal(MAX_PASSWORD_BYTES, 72)
  assert.equal(newPasswordSchema.safeParse("a".repeat(72)).success, true)
  assert.equal(newPasswordSchema.safeParse("a".repeat(73)).success, false)
  // Thai is three bytes a character: 24 fit, 25 would be silently cut by bcrypt.
  assert.equal(newPasswordSchema.safeParse("ก".repeat(24)).success, true)
  assert.equal(newPasswordSchema.safeParse("ก".repeat(25)).success, false)
})

test("there are no rules about which characters a password contains", () => {
  for (const password of ["alllowercase", "ALLUPPERCASE", "12345678901", "        spaces        ", "ผ่านผ่านผ่าน"]) {
    assert.equal(newPasswordSchema.safeParse(password).success, true, password)
  }
  assert.equal(newPasswordSchema.safeParse("short").success, false)
})
