import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"

import { createApp } from "../src/app"
import { parseCorsOrigins } from "../src/config/env"

const ALLOWED = "http://localhost:3000" // the default CORS_ORIGIN

async function preflight(origin: string, method = "POST", headers = "content-type") {
  const server = http.createServer(createApp())
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Unable to obtain server port")
  }
  try {
    return await fetch(`http://localhost:${address.port}/api/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": method,
        "Access-Control-Request-Headers": headers,
      },
    })
  } finally {
    server.close()
  }
}

test("a preflight from the configured origin is answered with that origin, credentials, and the fixed methods and headers", async () => {
  const res = await preflight(ALLOWED)

  assert.equal(res.status, 204)
  assert.equal(res.headers.get("access-control-allow-origin"), ALLOWED)
  assert.equal(res.headers.get("access-control-allow-credentials"), "true")
  assert.equal(res.headers.get("access-control-allow-methods"), "GET,POST,PUT,PATCH,DELETE,OPTIONS")
  assert.equal(res.headers.get("access-control-allow-headers"), "Content-Type,Authorization")
})

test("a preflight from any other origin gets no Access-Control-Allow-Origin", async () => {
  const res = await preflight("https://malicious-site.example")

  // Without Allow-Origin the browser refuses the response, whatever else is sent.
  assert.equal(res.headers.get("access-control-allow-origin"), null)
})

test("the allowed headers do not grow to match whatever a preflight asks for", async () => {
  const res = await preflight(ALLOWED, "POST", "content-type, x-evil-header")

  assert.doesNotMatch(res.headers.get("access-control-allow-headers") ?? "", /x-evil-header/i)
})

test("the allowed methods do not include TRACE or HEAD", async () => {
  const methods = (await preflight(ALLOWED, "TRACE")).headers.get("access-control-allow-methods") ?? ""

  assert.doesNotMatch(methods, /TRACE|HEAD/)
})

test("CORS_ORIGIN is split on commas and trimmed", () => {
  assert.deepEqual(parseCorsOrigins(" http://a.test , https://b.test,,"), ["http://a.test", "https://b.test"])
})

test("a wildcard in CORS_ORIGIN stops the server from starting", () => {
  assert.throws(() => parseCorsOrigins("*"), /must list explicit origins/)
  assert.throws(() => parseCorsOrigins("https://a.test, *"), /must list explicit origins/)
})
