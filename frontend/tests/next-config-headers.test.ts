import test from "node:test"
import assert from "node:assert/strict"

import nextConfig from "../next.config"

const env = process.env as Record<string, string | undefined>

type Rule = { source: string; headers: { key: string; value: string }[] }

/** The headers Next would send for `path`, applying rules in order so a later rule wins, as Next does. */
async function headersFor(path: "/browse" | "/admin/api/tor-pdf", nodeEnv: "production" | "development") {
  const saved = env.NODE_ENV
  env.NODE_ENV = nodeEnv
  try {
    const rules = (await nextConfig.headers!()) as Rule[]
    const result = new Map<string, string>()
    for (const rule of rules) {
      const matches = rule.source === "/:path*" || rule.source === path
      if (!matches) continue
      for (const { key, value } of rule.headers) result.set(key, value)
    }
    return result
  } finally {
    if (saved === undefined) delete env.NODE_ENV
    else env.NODE_ENV = saved
  }
}

test("pages cannot be framed by anyone: DENY and frame-ancestors 'none'", async () => {
  const headers = await headersFor("/browse", "production")

  assert.equal(headers.get("X-Frame-Options"), "DENY")
  assert.match(headers.get("Content-Security-Policy")!, /frame-ancestors 'none'/)
  assert.match(headers.get("Content-Security-Policy")!, /object-src 'none'/)
})

test("the admin PDF viewer may be framed by this site only", async () => {
  const headers = await headersFor("/admin/api/tor-pdf", "production")

  assert.equal(headers.get("X-Frame-Options"), "SAMEORIGIN")
  assert.match(headers.get("Content-Security-Policy")!, /frame-ancestors 'self'/)
})

test("production scripts get no eval, and connections get no websockets or localhost", async () => {
  const csp = (await headersFor("/browse", "production")).get("Content-Security-Policy")!

  assert.doesNotMatch(csp, /unsafe-eval/)
  assert.doesNotMatch(csp, /\bwss?:/)
  assert.doesNotMatch(csp, /localhost/)
})

test("only same-origin and blob frames are allowed, not any https site", async () => {
  const csp = (await headersFor("/browse", "production")).get("Content-Security-Policy")!
  const frameSrc = csp.split(";").map((part) => part.trim()).find((part) => part.startsWith("frame-src"))

  assert.equal(frameSrc, "frame-src 'self' blob:")
})

test("development keeps eval and websockets so hot reload works", async () => {
  const csp = (await headersFor("/browse", "development")).get("Content-Security-Policy")!

  assert.match(csp, /unsafe-eval/)
  assert.match(csp, /ws:/)
})

test("the framework header is switched off", () => {
  assert.equal(nextConfig.poweredByHeader, false)
})

test("the other headers are still sent on every page", async () => {
  const headers = await headersFor("/browse", "production")

  assert.equal(headers.get("X-Content-Type-Options"), "nosniff")
  assert.match(headers.get("Strict-Transport-Security")!, /max-age=31536000/)
  assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")
})
