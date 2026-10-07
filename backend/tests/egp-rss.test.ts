import test from "node:test"
import assert from "node:assert/strict"
import { ANNOUNCE_TYPES, METHOD_IDS, fetchAnnouncements } from "../src/scraper/egp-rss"

/**
 * The 20-item cap (§4.2) and the per-method sweep that works around it.
 *
 * Titles are ASCII rather than Thai: the feed serves windows-874 and these
 * fixtures are assembled as bytes, so Thai text would test the encoder rather
 * than the request accounting these cases are about. Decoding has its own
 * coverage through the live ingest.
 */

const LINK = "https://process5.gprocurement.go.th/egp-upload-service/v1/downloadFile?fileId="

type Fixture = { projectNos: string[]; countByDay: number }

function feedXml({ projectNos, countByDay }: Fixture): string {
  const items = projectNos
    .map(
      (projectNo) => `
    <item>
      <title>Project ${projectNo}</title>
      <link>${LINK}${projectNo}</link>
      <description>${projectNo}, e-bidding, invitation</description>
      <pubDate>2026-10-07</pubDate>
    </item>`
    )
    .join("")
  return `<?xml version="1.0" encoding="windows-874"?>
<rss version="2.0"><channel><countbyday>${countByDay}</countbyday>${items}</channel></rss>`
}

/**
 * Stands in for the feed. `byMethod` is keyed by the `methodId` parameter, with
 * the broad (unnarrowed) query under "". A fixture of `null` makes that request
 * fail, which is how the resilience case is set up.
 */
function stubFeed(byMethod: Record<string, Fixture | null>) {
  const urls: string[] = []
  const original = globalThis.fetch

  globalThis.fetch = (async (input: string | URL) => {
    const url = new URL(String(input))
    const methodId = url.searchParams.get("methodId") ?? ""
    urls.push(methodId)

    const fixture = methodId in byMethod ? byMethod[methodId] : { projectNos: [], countByDay: 0 }
    if (fixture === null) throw new Error(`feed refused methodId=${methodId}`)

    const body = Buffer.from(feedXml(fixture), "latin1")
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    }
  }) as typeof globalThis.fetch

  return { urls, restore: () => { globalThis.fetch = original } }
}

const query = { deptId: "0102", announceType: ANNOUNCE_TYPES.plan } as const

test("a day under the cap costs one request", async () => {
  const feed = stubFeed({ "": { projectNos: ["1", "2"], countByDay: 2 } })
  try {
    const result = await fetchAnnouncements(query)
    assert.equal(result.requests, 1)
    assert.equal(result.truncated, false)
    assert.deepEqual(feed.urls, [""])
    assert.deepEqual(result.items.map((item) => item.projectNo), ["1", "2"])
  } finally {
    feed.restore()
  }
})

test("a truncated day is re-queried per method, and the extra items are kept", async () => {
  // The shape the live feed showed for P0: 68 published, 20 returned.
  const feed = stubFeed({
    "": { projectNos: ["1", "2"], countByDay: 4 },
    [METHOD_IDS.eBidding]: { projectNos: ["2", "3"], countByDay: 2 },
    [METHOD_IDS.specific]: { projectNos: ["4"], countByDay: 1 },
  })
  try {
    const result = await fetchAnnouncements(query)
    assert.equal(result.requests, 1 + Object.keys(METHOD_IDS).length)
    // Merged by project number, so the duplicate "2" is not counted twice.
    assert.deepEqual(result.items.map((item) => item.projectNo).sort(), ["1", "2", "3", "4"])
    assert.equal(result.truncated, false, "the day's total was reached")
    assert.deepEqual(result.saturatedMethods, [])
    assert.deepEqual(result.failedMethods, [])
  } finally {
    feed.restore()
  }
})

test("a method over the cap on its own is named, since method is the only axis this splits on", async () => {
  const feed = stubFeed({
    "": { projectNos: ["1"], countByDay: 40 },
    [METHOD_IDS.eBidding]: { projectNos: ["2", "3"], countByDay: 30 },
  })
  try {
    const result = await fetchAnnouncements(query)
    assert.deepEqual(result.saturatedMethods, [METHOD_IDS.eBidding])
    // Reporting the day as complete would hide announcements; what is left is
    // reachable only by announceDate (§4.6) or deptSubId.
    assert.equal(result.truncated, true)
    assert.equal(result.countByDay, 40)
  } finally {
    feed.restore()
  }
})

test("one method's request failing costs that method, not the type", async () => {
  const feed = stubFeed({
    "": { projectNos: ["1"], countByDay: 9 },
    [METHOD_IDS.eBidding]: null,
    [METHOD_IDS.specific]: { projectNos: ["2"], countByDay: 1 },
  })
  try {
    const result = await fetchAnnouncements(query)
    assert.deepEqual(result.failedMethods, [METHOD_IDS.eBidding])
    // The sweep carried on: the broad items and every other method's are there.
    assert.deepEqual(result.items.map((item) => item.projectNo).sort(), ["1", "2"])
    assert.equal(result.requests, 1 + Object.keys(METHOD_IDS).length)
  } finally {
    feed.restore()
  }
})

test("--no-narrow accepts the cap and makes one request", async () => {
  const feed = stubFeed({ "": { projectNos: ["1"], countByDay: 68 } })
  try {
    const result = await fetchAnnouncements(query, { narrowOnTruncation: false })
    assert.equal(result.requests, 1)
    assert.equal(result.truncated, true)
    assert.deepEqual(feed.urls, [""])
  } finally {
    feed.restore()
  }
})
