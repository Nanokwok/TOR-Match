import test from "node:test"
import assert from "node:assert/strict"
import { planGoogleSignIn, type GoogleProfile } from "../src/domain/google-account"

const profile: GoogleProfile = { googleId: "g-1", email: "a@x.co", emailVerified: true, name: "A" }

test("a known Google id signs in, whatever the email says", () => {
  assert.deepEqual(planGoogleSignIn({ ...profile, emailVerified: false }, { id: "u1", googleId: "g-1" }, null), {
    action: "login",
    userId: "u1",
  })
})

test("a new verified email creates an account", () => {
  assert.deepEqual(planGoogleSignIn(profile, null, null), { action: "create" })
})

test("a verified email matching a password account links to it", () => {
  assert.deepEqual(planGoogleSignIn(profile, null, { id: "u2" }), { action: "link", userId: "u2" })
})

test("an unverified email is never used to create or link", () => {
  const unverified = { ...profile, emailVerified: false }
  assert.deepEqual(planGoogleSignIn(unverified, null, null), { action: "reject", reason: "email-not-verified" })
  assert.deepEqual(planGoogleSignIn(unverified, null, { id: "u2" }), { action: "reject", reason: "email-not-verified" })
})

test("an email already tied to a different Google account is refused", () => {
  assert.deepEqual(planGoogleSignIn(profile, null, { id: "u3", googleId: "g-other" }), {
    action: "reject",
    reason: "email-taken-by-another-google-account",
  })
})

test("an account already linked to this same Google id by email still links cleanly", () => {
  assert.deepEqual(planGoogleSignIn(profile, null, { id: "u4", googleId: "g-1" }), { action: "link", userId: "u4" })
})
