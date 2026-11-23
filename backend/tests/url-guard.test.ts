import test from "node:test"
import assert from "node:assert/strict"

import { downloadTorDocuments } from "../src/scraper/tor-documents"
import { assertSafeDocumentUrl, isBlockedAddress, type UrlGuardOptions } from "../src/scraper/url-guard"

/** The guard as production runs it, with DNS answered from a table instead of the network. */
function guard(table: Record<string, string[]> = {}): UrlGuardOptions {
  return {
    allowAnyHost: false,
    allowedHosts: ["gprocurement.go.th", "bangkok.go.th"],
    resolve: async (hostname) => table[hostname] ?? [],
  }
}

const PUBLIC = ["203.0.113.10"]

test("addresses that are not public servers are blocked", () => {
  for (const ip of [
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:a9fe:a9fe", // 169.254.169.254 written in hex
    "not-an-ip",
  ]) {
    assert.equal(isBlockedAddress(ip), true, `${ip} should be blocked`)
  }
})

test("public addresses are not blocked", () => {
  for (const ip of ["8.8.8.8", "203.0.113.10", "172.15.255.255", "172.32.0.1", "2001:4860:4860::8888", "::ffff:8.8.8.8"]) {
    assert.equal(isBlockedAddress(ip), false, `${ip} should be allowed`)
  }
})

test("only http and https links are accepted", async () => {
  await assert.rejects(assertSafeDocumentUrl("file:///etc/passwd", guard()), /protocol file: is not allowed/)
  await assert.rejects(assertSafeDocumentUrl("ftp://process3.gprocurement.go.th/a.pdf", guard()), /protocol ftp: is not allowed/)
  await assert.rejects(assertSafeDocumentUrl("not a url", guard()), /not a valid URL/)
})

test("a host on the allowlist that resolves to a public address is accepted, subdomains included", async () => {
  const table = { "process3.gprocurement.go.th": PUBLIC, "egp2.bangkok.go.th": PUBLIC }
  const http = await assertSafeDocumentUrl("http://process3.gprocurement.go.th/a.pdf", guard(table))
  assert.equal(http.hostname, "process3.gprocurement.go.th")
  await assertSafeDocumentUrl("https://egp2.bangkok.go.th/a.pdf", guard(table))
})

test("a host that is not on the allowlist is refused", async () => {
  const table = { "evil.example": PUBLIC, "notgprocurement.go.th": PUBLIC }
  await assert.rejects(assertSafeDocumentUrl("https://evil.example/a.pdf", guard(table)), /not on the allowlist/)
  // A name that merely ends with the allowed text is not a subdomain of it.
  await assert.rejects(assertSafeDocumentUrl("https://notgprocurement.go.th/a.pdf", guard(table)), /not on the allowlist/)
})

test("IP addresses are refused even when they look harmless", async () => {
  await assert.rejects(assertSafeDocumentUrl("http://169.254.169.254/latest/meta-data/", guard()), /IP addresses are not allowed/)
  await assert.rejects(assertSafeDocumentUrl("http://[::1]/", guard()), /IP addresses are not allowed/)
})

test("an allowed name that resolves to a private address is refused", async () => {
  const table = { "process3.gprocurement.go.th": ["10.0.0.5", "203.0.113.10"] }
  await assert.rejects(assertSafeDocumentUrl("http://process3.gprocurement.go.th/a.pdf", guard(table)), /non-public address \(10\.0\.0\.5\)/)
})

test("a name that does not resolve is refused", async () => {
  await assert.rejects(assertSafeDocumentUrl("http://process3.gprocurement.go.th/a.pdf", guard()), /did not resolve/)
})

test("links with a user name or password in them are refused", async () => {
  const table = { "process3.gprocurement.go.th": PUBLIC }
  await assert.rejects(assertSafeDocumentUrl("http://user:pw@process3.gprocurement.go.th/a.pdf", guard(table)), /embedded credentials/)
})

// ---- the downloader applies the guard to the first request and to every redirect ----------

const pdfBody = () => Buffer.from(`%PDF-1.4\n${"x".repeat(256)}\n%%EOF`)
const redirectTo = (location: string) => new Response(null, { status: 302, headers: { location } })

test("downloadTorDocuments refuses a link to a host it should not call, without fetching anything", async () => {
  let calls = 0
  const fetchFn = (async () => {
    calls += 1
    return new Response(pdfBody())
  }) as typeof fetch

  await assert.rejects(
    downloadTorDocuments("http://169.254.169.254/latest/meta-data/", { urlGuard: guard(), fetchFn }),
    /Unsafe document URL/
  )
  assert.equal(calls, 0)
})

test("a redirect to a private address is refused", async () => {
  const table = { "process3.gprocurement.go.th": PUBLIC, "egp2.bangkok.go.th": ["169.254.169.254"] }
  const seen: string[] = []
  const fetchFn = (async (input: URL) => {
    seen.push(String(input))
    return redirectTo("http://egp2.bangkok.go.th/internal")
  }) as unknown as typeof fetch

  await assert.rejects(
    downloadTorDocuments("http://process3.gprocurement.go.th/a.pdf", { urlGuard: guard(table), fetchFn }),
    /non-public address \(169\.254\.169\.254\)/
  )
  assert.deepEqual(seen, ["http://process3.gprocurement.go.th/a.pdf"])
})

test("a redirect to a host off the allowlist is refused", async () => {
  const table = { "process3.gprocurement.go.th": PUBLIC }
  const fetchFn = (async () => redirectTo("https://evil.example/a.pdf")) as unknown as typeof fetch

  await assert.rejects(
    downloadTorDocuments("http://process3.gprocurement.go.th/a.pdf", { urlGuard: guard(table), fetchFn }),
    /not on the allowlist/
  )
})

test("a redirect between allowed public hosts is followed", async () => {
  const table = { "process3.gprocurement.go.th": PUBLIC, "egp2.bangkok.go.th": PUBLIC }
  let calls = 0
  const fetchFn = (async () => {
    calls += 1
    return calls === 1 ? redirectTo("http://egp2.bangkok.go.th/real.pdf") : new Response(pdfBody())
  }) as unknown as typeof fetch

  const [document] = await downloadTorDocuments("http://process3.gprocurement.go.th/a.pdf", { urlGuard: guard(table), fetchFn })
  assert.ok(document.pdf.byteLength > 0)
  assert.equal(calls, 2)
})

test("a redirect loop stops", async () => {
  const table = { "process3.gprocurement.go.th": PUBLIC }
  const fetchFn = (async () => redirectTo("http://process3.gprocurement.go.th/again")) as unknown as typeof fetch

  await assert.rejects(
    downloadTorDocuments("http://process3.gprocurement.go.th/a.pdf", { urlGuard: guard(table), fetchFn }),
    /redirected more than 5 times/
  )
})
