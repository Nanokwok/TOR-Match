import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { createApp } from "../src/app"

test("Express app includes essential HTTP security headers via helmet", async () => {
  const app = createApp()
  const server = http.createServer(app)

  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }

  try {
    const res = await fetch(`http://localhost:${address.port}/api/health`)
    assert.equal(res.status, 200)

    // X-Content-Type-Options: nosniff
    assert.equal(res.headers.get("x-content-type-options"), "nosniff")

    // X-Frame-Options: DENY
    assert.equal(res.headers.get("x-frame-options"), "DENY")

    // Strict-Transport-Security
    const hsts = res.headers.get("strict-transport-security")
    assert.ok(hsts, "HSTS header must be present")
    assert.match(hsts!, /max-age=31536000/)
    assert.match(hsts!, /includeSubDomains/)
    assert.match(hsts!, /preload/)

    // Content-Security-Policy
    const csp = res.headers.get("content-security-policy")
    assert.ok(csp, "CSP header must be present")
    assert.match(csp!, /default-src 'self'/)
    assert.match(csp!, /frame-ancestors 'none'/)
    assert.match(csp!, /object-src 'none'/)

    // Referrer-Policy
    assert.equal(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin")
  } finally {
    server.close()
  }
})
