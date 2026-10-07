import test from "node:test"
import assert from "node:assert/strict"
import {
  ANNOUNCE_TYPES,
  METHOD_IDS,
  announceDateCode,
  fetchAnnouncements,
  fetchAnnouncementsOverDays,
} from "../src/scraper/egp-rss"

/**
 * The 20-item cap (§4.2) and the per-method sweep that works around it.
 *
 * Titles are ASCII rather than Thai: the feed serves windows-874 and these
 * fixtures are assembled as bytes, so Thai text would test the encoder rather
 * than the request accounting these cases are about. Decoding has its own
 * coverage through the live ingest.
 */

const LINK = "https://process5.gprocurement.go.th/egp-upload-service/v1/downloadFile?fileId="

type Fixture = {
  projectNos: string[]
  countByDay: number
  /** Varies the document url for the same project, for the dedupe cases. */
  urlSuffix?: string
}

function feedXml({ projectNos, countByDay, urlSuffix = "" }: Fixture): string {
  const items = projectNos
    .map(
      (projectNo) => `
    <item>
      <title>Project ${projectNo}</title>
      <link>${LINK}${projectNo}${urlSuffix}</link>
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

test("narrowing can be declined, accepting the cap for one request", async () => {
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

/**
 * Walking `announceDate` day by day (§4.6) — the axis that does get past the
 * cap, since each day queried has its own 20-item allowance.
 */

/**
 * Stands in for the feed, keyed by the `announceDate` parameter. A date absent
 * from the map returns nothing, which is what a weekend looks like; a fixture
 * of `null` makes that day's request fail.
 */
function stubDays(byDate: Record<string, Fixture | null>) {
  const dates: string[] = []
  const original = globalThis.fetch

  globalThis.fetch = (async (input: string | URL) => {
    const announceDate = new URL(String(input)).searchParams.get("announceDate") ?? ""
    dates.push(announceDate)

    const fixture = announceDate in byDate ? byDate[announceDate] : { projectNos: [], countByDay: 0 }
    if (fixture === null) throw new Error(`feed refused announceDate=${announceDate}`)

    const body = Buffer.from(feedXml(fixture), "latin1")
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    }
  }) as typeof globalThis.fetch

  return { dates, restore: () => { globalThis.fetch = original } }
}

test("announceDateCode counts back in Bangkok time, not the host's", () => {
  // 2026-10-07T18:30Z is already 2026-10-08 in Bangkok (UTC+7), so "today" for
  // the feed is the 8th. A host reading its own clock would ask for the 7th and
  // silently skip a day's announcements.
  const evening = new Date("2026-10-07T18:30:00Z")
  assert.equal(announceDateCode(0, evening), "20261008")
  assert.equal(announceDateCode(1, evening), "20261007")
  // Across a month boundary, which naive arithmetic on the day number breaks.
  assert.equal(announceDateCode(8, evening), "20260930")
})

test("a day-walk makes one request per day and keeps every day's items", async () => {
  const today = announceDateCode(0)
  const yesterday = announceDateCode(1)
  const feed = stubDays({
    [today]: { projectNos: ["1", "2"], countByDay: 2 },
    [yesterday]: { projectNos: ["3"], countByDay: 1 },
  })
  try {
    const result = await fetchAnnouncementsOverDays(query, { days: 3 })
    assert.equal(result.requests, 3)
    assert.deepEqual(feed.dates, [today, yesterday, announceDateCode(2)])
    assert.deepEqual(result.items.map((item) => item.projectNo).sort(), ["1", "2", "3"])
    // Summed across the days walked, so it can be compared with what arrived.
    assert.equal(result.countByDay, 3)
    assert.equal(result.truncated, false)
  } finally {
    feed.restore()
  }
})

test("an empty day is not the end of the walk — weekends are genuinely empty", async () => {
  const feed = stubDays({
    // Nothing for today or yesterday; the day before has announcements.
    [announceDateCode(2)]: { projectNos: ["1"], countByDay: 1 },
  })
  try {
    const result = await fetchAnnouncementsOverDays(query, { days: 3 })
    assert.deepEqual(result.items.map((item) => item.projectNo), ["1"])
    assert.equal(result.requests, 3)
  } finally {
    feed.restore()
  }
})

test("the same announcement seen on two days is kept once", async () => {
  const feed = stubDays({
    [announceDateCode(0)]: { projectNos: ["1"], countByDay: 1 },
    [announceDateCode(1)]: { projectNos: ["1"], countByDay: 1 },
  })
  try {
    const result = await fetchAnnouncementsOverDays(query, { days: 2 })
    assert.equal(result.items.length, 1)
    assert.equal(result.items[0].projectNo, "1")
  } finally {
    feed.restore()
  }
})

test("a project re-announced with a different document keeps both", async () => {
  // Deduplication is by project *and* url, not by project alone. A tender
  // re-published with a new file is two real announcements, and the link
  // history is meant to carry both — deduping by project number would drop
  // whichever day was walked second.
  const feed = stubDays({
    [announceDateCode(0)]: { projectNos: ["1"], countByDay: 1, urlSuffix: "-v2" },
    [announceDateCode(1)]: { projectNos: ["1"], countByDay: 1 },
  })
  try {
    const result = await fetchAnnouncementsOverDays(query, { days: 2 })
    assert.equal(result.items.length, 2)
    assert.deepEqual(
      result.items.map((item) => item.pdfUrl.endsWith("-v2")).sort(),
      [false, true]
    )
  } finally {
    feed.restore()
  }
})

test("a day over the cap is named, since the walk cannot split it further", async () => {
  const busy = announceDateCode(0)
  const feed = stubDays({ [busy]: { projectNos: ["1", "2"], countByDay: 84 } })
  try {
    const result = await fetchAnnouncementsOverDays(query, { days: 2 })
    assert.deepEqual(result.cappedDays, [busy])
    assert.equal(result.truncated, true)
    assert.equal(result.countByDay, 84)
  } finally {
    feed.restore()
  }
})

test("one day's request failing costs that day, not the walk", async () => {
  const feed = stubDays({
    [announceDateCode(0)]: null,
    [announceDateCode(1)]: { projectNos: ["7"], countByDay: 1 },
  })
  try {
    const result = await fetchAnnouncementsOverDays(query, { days: 2 })
    assert.deepEqual(result.failedDays, [announceDateCode(0)])
    // The walk carried on and the later day's announcement is there.
    assert.deepEqual(result.items.map((item) => item.projectNo), ["7"])
  } finally {
    feed.restore()
  }
})
