import test from "node:test"
import assert from "node:assert/strict"

import { CLEAR_SITE_DATA } from "../src/lib/clear-site-data"
import { expiredRootCookieOptions, prefixedCookieName } from "../src/lib/cookie-names"

test("production names get __Host- (path /) or __Secure- (other paths)", () => {
  assert.equal(prefixedCookieName("tm_token", "__Host-", true), "__Host-tm_token")
  assert.equal(prefixedCookieName("tm_admin_session", "__Secure-", true), "__Secure-tm_admin_session")
})

test("outside production the name is unchanged, because the prefixes need Secure and development is plain http", () => {
  assert.equal(prefixedCookieName("tm_token", "__Host-", false), "tm_token")
})

test("a name that already carries a prefix is not prefixed twice", () => {
  assert.equal(prefixedCookieName("__Host-tm_token", "__Host-", true), "__Host-tm_token")
  assert.equal(prefixedCookieName("__Secure-x", "__Host-", true), "__Secure-x")
})

test("a cookie is expired with Path=/ so a __Host- one is actually removed", () => {
  const options = expiredRootCookieOptions()
  assert.equal(options.path, "/")
  assert.equal(options.maxAge, 0)
  assert.equal(options.httpOnly, true)
})

test("logout tells the browser to clear its cache and storage, not every cookie on the domain", () => {
  assert.match(CLEAR_SITE_DATA, /"cache"/)
  assert.match(CLEAR_SITE_DATA, /"storage"/)
  assert.doesNotMatch(CLEAR_SITE_DATA, /"cookies"/)
})
