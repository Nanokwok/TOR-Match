import test, { after, afterEach, before } from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"

import { createApp } from "../src/app"
import { Tor } from "../src/models/Tor.model"
import { TorDraft } from "../src/models/TorDraft.model"
import { User } from "../src/models/User.model"
import { publishDraft } from "../src/services/tor-publish.service"
import { signAuthToken } from "../src/utils/jwt"
import { startMemoryDb } from "./helpers/memory-db"

let db: Awaited<ReturnType<typeof startMemoryDb>>
let server: Server
let base: string

before(async () => {
  db = await startMemoryDb()
  server = createApp().listen(0)
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
})

afterEach(() => db.clear())

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await db.stop()
})

const announcement = (announceType: string) => ({
  announceType,
  announceLabel: "",
  url: `https://example.test/${announceType}.pdf`,
  publishedDate: "2026-10-01",
  title: "",
})

/**
 * A draft that is ready to publish — it has a title, a department and a D0
 * invitation — and whose confidence is far below the auto-approve bar, so
 * creating it does not publish it behind the test's back.
 */
async function makeDraft(overrides: Record<string, unknown> = {}) {
  return TorDraft.create({
    announcementNo: "69109000001",
    title: { en: "Network maintenance", th: "บำรุงรักษาเครือข่าย" },
    department: { en: "Digital Office", th: "สำนักดิจิทัล" },
    localOffice: { en: "", th: "" },
    summary: { en: "", th: "" },
    budgetBaht: 2_500_000,
    projectScale: "MEDIUM",
    durationDays: 365,
    method: "e-bidding",
    status: "open",
    deadline: "2026-11-05T12:00:00+07:00",
    announcements: [announcement("B0"), announcement("D0")],
    qualificationRequirements: [
      {
        id: "q1",
        key: "manual",
        requirement: { en: "Registered with e-GP", th: "ขึ้นทะเบียน e-GP" },
        torCriteria: { en: "Registered with e-GP", th: "ขึ้นทะเบียน e-GP" },
      },
    ],
    financials: { totalBudgetBaht: 2_500_000, medianPriceBaht: 2_400_000, method: "e-bidding", milestones: [] },
    aiConfidence: 40,
    ...overrides,
  })
}

async function signIn(role: "user" | "admin") {
  const user = await User.create({ name: role, email: `${role}@example.com`, passwordHash: "x", role })
  return signAuthToken({ sub: String(user._id), email: user.email, role })
}

async function publishVia(id: unknown, token?: string) {
  return fetch(`${base}/tor-drafts/${id}/publish`, {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
}

test("a draft is not published just because it was created below the auto-approve bar", async () => {
  await makeDraft()
  assert.equal(await Tor.countDocuments(), 0)
})

test("publishing copies the draft to /browse and records the approval on the draft", async () => {
  const draft = await makeDraft()
  const response = await publishVia(draft._id, await signIn("admin"))
  assert.equal(response.status, 200)
  // Who pressed publish, so the approval cannot be denied afterwards.
  const admin = await User.findOne({ role: "admin" })
  assert.equal(String((await TorDraft.findById(draft._id))?.reviewedBy), String(admin?._id))

  const live = await Tor.findOne({ announcementNo: "69109000001" })
  assert.ok(live, "the TOR is on /browse")
  assert.equal(live.title.th, "บำรุงรักษาเครือข่าย")
  assert.equal(live.announcements.length, 2)

  // The reviewer pressed "Approved & published": the draft has to say so. The
  // ingest leaves an approved draft's published content alone, so a draft that
  // still reads "need-review" gets its hand corrections overwritten.
  const stored = await TorDraft.findById(draft._id)
  assert.equal(stored?.reviewStatus, "approved")
  assert.equal(String(stored?.publishedTorId), String(live._id))
  assert.ok(stored?.publishedAt)

  const body = await response.json()
  assert.equal(body.draft.reviewStatus, "approved", "the review screen reads its badge from this response")
})

test("publishing the same draft twice updates the TOR instead of duplicating it", async () => {
  const draft = await makeDraft()
  const token = await signIn("admin")
  await publishVia(draft._id, token)
  await TorDraft.updateOne({ _id: draft._id }, { $set: { budgetBaht: 3_000_000 } })
  assert.equal((await publishVia(draft._id, token)).status, 200)

  assert.equal(await Tor.countDocuments(), 1)
  assert.equal((await Tor.findOne({ announcementNo: "69109000001" }))?.budgetBaht, 3_000_000)
})

test("a draft with no invitation yet is refused, and nothing changes", async () => {
  const draft = await makeDraft({ announcements: [announcement("B0")] })
  const response = await publishVia(draft._id, await signIn("admin"))
  assert.equal(response.status, 400)
  assert.match((await response.json()).error, /invitation/)

  assert.equal(await Tor.countDocuments(), 0)
  const stored = await TorDraft.findById(draft._id)
  assert.equal(stored?.reviewStatus, "need-review")
  assert.equal(stored?.publishedTorId, null)
})

test("publishing is written to the security log with the admin who did it", async () => {
  const draft = await makeDraft()
  const token = await signIn("admin")
  const lines: string[] = []
  const original = console.log
  console.log = (...args: unknown[]) => void lines.push(args.map(String).join(" "))
  try {
    assert.equal((await publishVia(draft._id, token)).status, 200)
  } finally {
    console.log = original
  }

  const entry = lines.find((line) => line.includes("TOR_PUBLISHED"))
  assert.ok(entry, "a TOR_PUBLISHED entry is logged")
  assert.match(entry, /admin@example\.com/)
})

test("a draft missing a budget, a deadline or any qualification is refused, and nothing changes", async () => {
  const token = await signIn("admin")
  const cases: Array<[Record<string, unknown>, RegExp]> = [
    [{ announcementNo: "69109000101", budgetBaht: 0 }, /budget is missing/],
    [{ announcementNo: "69109000102", deadline: "" }, /deadline is missing/],
    [{ announcementNo: "69109000103", qualificationRequirements: [] }, /no qualification requirements/],
  ]
  for (const [overrides, message] of cases) {
    const draft = await makeDraft(overrides)
    const response = await publishVia(draft._id, token)
    assert.equal(response.status, 400)
    assert.match((await response.json()).error, message)
    assert.equal((await TorDraft.findById(draft._id))?.reviewStatus, "need-review")
  }
  assert.equal(await Tor.countDocuments(), 0)
})

test("a draft with no title is refused", async () => {
  const draft = await makeDraft({ title: { en: "", th: "" } })
  const response = await publishVia(draft._id, await signIn("admin"))
  assert.equal(response.status, 400)
  assert.match((await response.json()).error, /title is empty/)
  assert.equal(await Tor.countDocuments(), 0)
})

test("publishing an unknown draft is a 404, and a malformed id is not a server error", async () => {
  const token = await signIn("admin")
  assert.equal((await publishVia("64b000000000000000000000", token)).status, 404)
  assert.ok((await publishVia("not-an-id", token)).status < 500)
})

test("only an admin can publish: signed out is 401, an ordinary user is 403", async () => {
  const draft = await makeDraft()
  assert.equal((await publishVia(draft._id)).status, 401)
  assert.equal((await publishVia(draft._id, await signIn("user"))).status, 403)
  assert.equal(await Tor.countDocuments(), 0)
})

test("review bookkeeping never reaches the published TOR", async () => {
  const draft = await makeDraft({ aiConfidence: 55, pdfUrl: "https://example.test/d.pdf" })
  await publishDraft(draft)

  const live = (await Tor.findOne({ announcementNo: "69109000001" }).lean()) as Record<string, unknown>
  for (const field of ["aiConfidence", "reviewStatus", "pdfUrl", "sourceJobId", "publishedTorId", "lockedFields"]) {
    assert.equal(field in live, false, `${field} stays on the draft`)
  }
})

test("only the 20 most recent announcements are carried over to the published TOR", async () => {
  const many = Array.from({ length: 25 }, (_, index) => ({
    ...announcement("D2"),
    url: `https://example.test/D2-${index}.pdf`,
  }))
  const draft = await makeDraft({ announcements: [announcement("D0"), ...many] })
  await publishDraft(draft)

  const live = await Tor.findOne({ announcementNo: "69109000001" })
  assert.equal(live?.announcements.length, 20)
  assert.equal(live?.announcements.at(-1)?.url, "https://example.test/D2-24.pdf", "the newest are kept")
})
