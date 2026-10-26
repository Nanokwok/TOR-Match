import test, { after, afterEach, before } from "node:test"
import assert from "node:assert/strict"

import { Company } from "../src/models/Company.model"
import { DigestRun } from "../src/models/DigestRun.model"
import { NotificationSettings } from "../src/models/NotificationSettings.model"
import { Tor } from "../src/models/Tor.model"
import { User } from "../src/models/User.model"
import { WorkspaceCard } from "../src/models/WorkspaceCard.model"
import type { OutgoingEmail } from "../src/services/email.service"
import { sendDueDigests } from "../src/services/digest.service"
import { startMemoryDb } from "./helpers/memory-db"

let db: Awaited<ReturnType<typeof startMemoryDb>>
before(async () => {
  db = await startMemoryDb()
})
afterEach(() => db.clear())
after(() => db.stop())

// Monday 26 Oct 2026. 08:30 in Bangkok: the daily digest (08:00) is due, the weekly one (09:00) is not.
const MORNING = new Date("2026-10-26T01:30:00Z")
// 09:30 in Bangkok: both are due.
const LATE_MORNING = new Date("2026-10-26T02:30:00Z")

function mailbox(options: { succeed?: boolean; fail?: boolean } = {}) {
  const outbox: OutgoingEmail[] = []
  const send = async (message: OutgoingEmail) => {
    if (options.fail) throw new Error("smtp is down")
    outbox.push(message)
    return options.succeed ?? true
  }
  return { outbox, send }
}

async function makeUser(email = "ana@example.com") {
  return User.create({ name: "Ana", email, passwordHash: "x" })
}

async function makeCompany(owner: { _id: unknown }, overrides: Record<string, unknown> = {}) {
  return Company.create({ ownerId: owner._id, registeredCapitalThb: "1,000,000", ...overrides })
}

/** A TOR that arrived two hours before MORNING and is open for another ten days. */
async function makeTor(overrides: Record<string, unknown> = {}) {
  const inserted = await Tor.collection.insertOne({
    announcementNo: `no-${Math.random().toString(36).slice(2, 8)}`,
    title: { en: "Network maintenance", th: "บำรุงรักษาเครือข่าย" },
    department: { en: "Digital Office", th: "สำนักดิจิทัล" },
    localOffice: { en: "", th: "" },
    budgetBaht: 2_500_000,
    status: "open",
    deadline: "2026-11-05T12:00:00+07:00",
    announcementDate: "2026-10-25T09:00:00+07:00",
    qualificationRequirements: [],
    createdAt: new Date("2026-10-25T23:30:00Z"),
    updatedAt: new Date("2026-10-25T23:30:00Z"),
    ...overrides,
  })
  return inserted.insertedId
}

const failsForOneMillionCapital = {
  id: "r1",
  key: "registered-capital",
  requirement: { en: "Registered capital", th: "ทุนจดทะเบียน" },
  torCriteria: { en: "at least 50M", th: "ไม่น้อยกว่า 50 ล้าน" },
  autoCheckable: true,
  criteria: { type: "registered-capital", op: ">=", amountThb: 50_000_000 },
}

test("a company owner gets one daily digest listing the new TORs that fit, at their own address", async () => {
  const ana = await makeUser()
  await makeCompany(ana)
  await makeTor()
  const { outbox, send } = mailbox()

  const sent = await sendDueDigests({ now: MORNING, send })

  assert.deepEqual(sent, { daily: 1, weekly: 0 })
  assert.equal(outbox.length, 1)
  assert.equal(outbox[0].to, "ana@example.com")
  assert.ok(outbox[0].subject.includes("1"))
  assert.ok(outbox[0].text.includes("Network maintenance"))
})

test("running again in the same day sends nothing more, however often it is checked", async () => {
  const ana = await makeUser()
  await makeCompany(ana)
  // The weekly summary becomes due at 09:00, within the hour checked below; keep this about the daily one.
  await NotificationSettings.create({ userId: ana._id, weeklyDigestEnabled: false })
  await makeTor()
  const { outbox, send } = mailbox()

  await sendDueDigests({ now: MORNING, send })
  const later = await sendDueDigests({ now: new Date(MORNING.getTime() + 60 * 60 * 1000), send })
  const again = await sendDueDigests({ now: MORNING, send })

  assert.deepEqual(later, { daily: 0, weekly: 0 })
  assert.deepEqual(again, { daily: 0, weekly: 0 })
  assert.equal(outbox.length, 1)
  assert.equal(await DigestRun.countDocuments({ kind: "daily" }), 1)
})

test("two checks at the same moment still produce a single email", async () => {
  const ana = await makeUser()
  await makeCompany(ana)
  await makeTor()
  const { outbox, send } = mailbox()

  await Promise.all([sendDueDigests({ now: MORNING, send }), sendDueDigests({ now: MORNING, send })])

  assert.equal(outbox.length, 1)
})

test("nothing goes out before the chosen time or after the grace period", async () => {
  const ana = await makeUser()
  await makeCompany(ana)
  await makeTor()
  const { outbox, send } = mailbox()

  await sendDueDigests({ now: new Date("2026-10-26T00:30:00Z"), send }) // 07:30, before 08:00
  await sendDueDigests({ now: new Date("2026-10-26T09:00:00Z"), send }) // 16:00, six hours late is 14:00

  assert.equal(outbox.length, 0)
})

test("a user's own time is honoured: a 20:00 digest does not go out at 08:30", async () => {
  const ana = await makeUser()
  await makeCompany(ana)
  await makeTor()
  await NotificationSettings.create({ userId: ana._id, dailyDigestTime: "20:00" })
  const { outbox, send } = mailbox()

  await sendDueDigests({ now: MORNING, send })
  assert.equal(outbox.length, 0)

  await sendDueDigests({ now: new Date("2026-10-26T13:30:00Z"), send }) // 20:30 Bangkok
  assert.equal(outbox.length, 1)
})

test("the daily switch and the master email switch each turn it off", async () => {
  const ana = await makeUser("ana@example.com")
  const bob = await makeUser("bob@example.com")
  await makeCompany(ana)
  await makeCompany(bob)
  await makeTor()
  await NotificationSettings.create({ userId: ana._id, dailyDigestEnabled: false })
  await NotificationSettings.create({ userId: bob._id, emailEnabled: false })
  const { outbox, send } = mailbox()

  await sendDueDigests({ now: MORNING, send })

  assert.equal(outbox.length, 0)
})

test("someone with no company profile gets no digest", async () => {
  await makeUser()
  await makeTor()
  const { outbox, send } = mailbox()

  assert.deepEqual(await sendDueDigests({ now: MORNING, send }), { daily: 0, weekly: 0 })
  assert.equal(outbox.length, 0)
})

test("only TORs that are new, still open and not failing the profile are listed", async () => {
  const ana = await makeUser()
  await makeCompany(ana)
  await makeTor({ title: { en: "Fits and is new", th: "ใหม่และเหมาะ" } })
  await makeTor({ title: { en: "Arrived last week", th: "เก่า" }, createdAt: new Date("2026-10-20T00:00:00Z") })
  await makeTor({ title: { en: "Already closed", th: "ปิดแล้ว" }, status: "closed" })
  await makeTor({ title: { en: "Deadline passed", th: "เลยกำหนด" }, deadline: "2026-10-20T12:00:00+07:00" })
  await makeTor({ title: { en: "Needs 50M capital", th: "ทุนไม่พอ" }, qualificationRequirements: [failsForOneMillionCapital] })
  const { outbox, send } = mailbox()

  await sendDueDigests({ now: MORNING, send })

  assert.equal(outbox.length, 1)
  assert.ok(outbox[0].text.includes("Fits and is new"))
  for (const left of ["Arrived last week", "Already closed", "Deadline passed", "Needs 50M capital"]) {
    assert.ok(!outbox[0].text.includes(left), `${left} should not be listed`)
  }
})

test("a day with nothing new sends no email at all", async () => {
  const ana = await makeUser()
  await makeCompany(ana)
  const { outbox, send } = mailbox()

  assert.deepEqual(await sendDueDigests({ now: MORNING, send }), { daily: 0, weekly: 0 })
  assert.equal(outbox.length, 0)
})

test("if sending fails the day is not used up, and the next check tries again", async () => {
  const ana = await makeUser()
  await makeCompany(ana)
  await makeTor()
  const broken = mailbox({ fail: true })
  const silenced = console.error
  console.error = () => {}
  try {
    assert.deepEqual(await sendDueDigests({ now: MORNING, send: broken.send }), { daily: 0, weekly: 0 })
  } finally {
    console.error = silenced
  }
  assert.equal(await DigestRun.countDocuments(), 0)

  const working = mailbox()
  assert.deepEqual(await sendDueDigests({ now: MORNING, send: working.send }), { daily: 1, weekly: 0 })
  assert.equal(working.outbox.length, 1)
})

test("when email is not configured nothing is counted as sent and the day is kept for later", async () => {
  const ana = await makeUser()
  await makeCompany(ana)
  await makeTor()
  const unconfigured = mailbox({ succeed: false })

  assert.deepEqual(await sendDueDigests({ now: MORNING, send: unconfigured.send }), { daily: 0, weekly: 0 })
  assert.equal(await DigestRun.countDocuments(), 0)

  const configured = mailbox()
  assert.deepEqual(await sendDueDigests({ now: MORNING, send: configured.send }), { daily: 1, weekly: 0 })
})

test("the weekly summary goes out on the chosen weekday with the board and the team status", async () => {
  const ana = await makeUser()
  const bea = await makeUser("bea@example.com")
  await makeCompany(ana)
  await NotificationSettings.create({ userId: ana._id, dailyDigestEnabled: false })
  const closing = await makeTor({ title: { en: "Closes this week", th: "ปิดสัปดาห์นี้" }, deadline: "2026-10-30T12:00:00+07:00" })
  await WorkspaceCard.create({
    ownerId: ana._id,
    torId: closing,
    column: "in-progress",
    priority: "HIGH",
    assigneeIds: [bea._id],
    checklist: [{ label: "Read the TOR", completed: true }, { label: "Price it", completed: false }],
  })
  const { outbox, send } = mailbox()

  const sent = await sendDueDigests({ now: LATE_MORNING, send })

  assert.deepEqual(sent, { daily: 0, weekly: 1 })
  const mail = outbox[0]
  assert.equal(mail.to, "ana@example.com")
  assert.ok(mail.text.includes("In progress 1"))
  assert.ok(mail.text.includes("Checklist items done: 1 of 2"))
  assert.ok(mail.text.includes("High-priority cards still open: 1"))
  assert.ok(mail.text.includes("Closes this week"))
})

test("the weekly summary is not sent on another weekday", async () => {
  const ana = await makeUser()
  await makeCompany(ana)
  await NotificationSettings.create({ userId: ana._id, dailyDigestEnabled: false, weeklyDigestDay: "friday" })
  const tor = await makeTor()
  await WorkspaceCard.create({ ownerId: ana._id, torId: tor, column: "todo" })
  const { outbox, send } = mailbox()

  await sendDueDigests({ now: LATE_MORNING, send })

  assert.equal(outbox.length, 0)
})

test("trying a digest for one account ignores the schedule and the once-a-day record, and touches nobody else", async () => {
  const ana = await makeUser("ana@example.com")
  const bob = await makeUser("bob@example.com")
  await makeCompany(ana)
  await makeCompany(bob)
  await makeTor()
  const { outbox, send } = mailbox()
  const night = new Date("2026-10-26T17:00:00Z") // 00:00 Bangkok, nothing is due

  const first = await sendDueDigests({ now: night, send, force: { email: "ANA@example.com" } })
  const second = await sendDueDigests({ now: night, send, force: { email: "ana@example.com" } })

  // Each forced run sends both kinds: the daily digest and the weekly summary.
  assert.deepEqual(first, { daily: 1, weekly: 1 })
  assert.deepEqual(second, { daily: 1, weekly: 1 }, "forcing is repeatable")
  assert.equal(outbox.length, 4)
  assert.ok(outbox.every((mail) => mail.to === "ana@example.com"), "nobody but the chosen account is mailed")
  assert.equal(await DigestRun.countDocuments(), 0, "forced sends leave no record")
})
