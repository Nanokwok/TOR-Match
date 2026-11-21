import test from "node:test"
import assert from "node:assert/strict"

import { isSessionRevoked } from "../src/domain/session-revocation"

const changedAt = new Date("2026-03-01T10:00:00Z")

test("a session that began before the password changed is revoked", () => {
  assert.equal(isSessionRevoked(changedAt.getTime() - 1, changedAt), true)
})

test("a session that began at or after the change is kept", () => {
  assert.equal(isSessionRevoked(changedAt.getTime(), changedAt), false)
  assert.equal(isSessionRevoked(changedAt.getTime() + 1, changedAt), false)
})

test("an account whose password never changed revokes nothing", () => {
  assert.equal(isSessionRevoked(1, undefined), false)
  assert.equal(isSessionRevoked(undefined, null), false)
})

test("a token with no issue time cannot be shown to be newer, so it is revoked after a change", () => {
  assert.equal(isSessionRevoked(undefined, changedAt), true)
})
