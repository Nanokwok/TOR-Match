import test from "node:test"
import assert from "node:assert/strict"

import {
  PASSWORD_RESET_COOLDOWN_MS,
  PASSWORD_RESET_TTL_MS,
  buildResetUrl,
  generateResetToken,
  hashResetToken,
} from "../src/domain/password-reset"
import { renderPasswordResetEmail } from "../src/domain/password-reset-email"

test("a token is random, long and stored only as a hash of itself", () => {
  const a = generateResetToken()
  const b = generateResetToken()
  assert.notEqual(a.token, b.token)
  assert.match(a.token, /^[A-Za-z0-9_-]{43}$/, "32 random bytes, URL-safe")
  assert.equal(a.tokenHash, hashResetToken(a.token))
  assert.notEqual(a.tokenHash, a.token)
  assert.match(a.tokenHash, /^[0-9a-f]{64}$/)
})

test("the link goes to the forgot-password page with only the token in it", () => {
  assert.equal(buildResetUrl("https://app.example.com", "abc"), "https://app.example.com/forgot-password?token=abc")
  assert.equal(buildResetUrl("https://app.example.com/", "a b&c"), "https://app.example.com/forgot-password?token=a%20b%26c")
})

test("a link lives for an hour and a new one cannot be asked for within a minute", () => {
  assert.equal(PASSWORD_RESET_TTL_MS, 60 * 60 * 1000)
  assert.equal(PASSWORD_RESET_COOLDOWN_MS, 60 * 1000)
})

test("the email carries the link in both the text and the HTML, in Thai and English", () => {
  const url = "https://app.example.com/forgot-password?token=abc"
  const mail = renderPasswordResetEmail({ name: "Ana", resetUrl: url, appUrl: "https://app.example.com" })
  assert.match(mail.subject, /รีเซ็ตรหัสผ่าน/)
  assert.match(mail.subject, /Reset your TOR Match password/)
  assert.ok(mail.text.includes(url))
  assert.ok(mail.html.includes(`href="${url}"`), "the button links to it")
  assert.match(mail.text, /60 นาที/)
  assert.match(mail.text, /60 minutes/)
})

test("a name is escaped in the HTML so it cannot add markup", () => {
  const mail = renderPasswordResetEmail({ name: "<script>x</script>", resetUrl: "https://a/b", appUrl: "https://a" })
  // nosemgrep: javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag -- attack payload: the test proves it is escaped
  assert.ok(!mail.html.includes("<script>"))
  assert.ok(mail.html.includes("&lt;script&gt;"))
})

test("it does not claim to follow the user's notification settings", () => {
  const mail = renderPasswordResetEmail({ name: "Ana", resetUrl: "https://a/b", appUrl: "https://a" })
  assert.ok(!mail.html.includes("/settings/notifications"))
  assert.match(mail.html, /อีเมลเกี่ยวกับบัญชี/)
})
