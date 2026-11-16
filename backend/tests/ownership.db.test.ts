import test, { after, afterEach, before } from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"

import { createApp } from "../src/app"
import { Company } from "../src/models/Company.model"
import { Notification } from "../src/models/Notification.model"
import { NotificationSettings } from "../src/models/NotificationSettings.model"
import { Tor } from "../src/models/Tor.model"
import { User } from "../src/models/User.model"
import { WorkspaceCard } from "../src/models/WorkspaceCard.model"
import { signAuthToken } from "../src/utils/jwt"
import { startMemoryDb } from "./helpers/memory-db"

/**
 * Whose data is it? Every route below acts on "the signed-in user's" rows, and
 * the id in the URL is only ever a hint: a user who guesses someone else's id
 * must find nothing there, and must leave it untouched.
 */

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

async function makeUser(name: string) {
  const user = await User.create({ name, email: `${name}@example.com`, passwordHash: "x" })
  const token = signAuthToken({ sub: String(user._id), email: user.email, role: "user" })
  return { id: user._id, token }
}

type Person = Awaited<ReturnType<typeof makeUser>>

function call(person: Person | null, method: string, path: string, body?: unknown) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      ...(person ? { authorization: `Bearer ${person.token}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function makeTor() {
  const inserted = await Tor.collection.insertOne({
    announcementNo: `no-${Math.random().toString(36).slice(2, 8)}`,
    title: { en: "Network maintenance", th: "บำรุงรักษาเครือข่าย" },
    department: { en: "Digital Office", th: "สำนักดิจิทัล" },
    localOffice: { en: "", th: "" },
    budgetBaht: 2_500_000,
    status: "open",
    qualificationRequirements: [],
  })
  return inserted.insertedId
}

async function makeNotification(owner: Person, overrides: Record<string, unknown> = {}) {
  return Notification.create({
    userId: owner.id,
    category: "system",
    title: { en: "Hello", th: "สวัสดี" },
    description: { en: "A note", th: "ข้อความ" },
    ...overrides,
  })
}

// ---- signed out -----------------------------------------------------------

test("every personal route turns away a visitor who is not signed in", async () => {
  const id = "64b000000000000000000000"
  const routes: [string, string][] = [
    ["GET", "/notifications"],
    ["PATCH", `/notifications/${id}/read`],
    ["PATCH", "/notifications/read-all"],
    ["DELETE", `/notifications/${id}`],
    ["GET", "/notification-settings"],
    ["PUT", "/notification-settings"],
    ["GET", "/workspace/board"],
    ["POST", "/workspace/cards"],
    ["PATCH", `/workspace/cards/${id}`],
    ["PATCH", `/workspace/cards/${id}/move`],
    ["DELETE", `/workspace/cards/${id}`],
    ["GET", "/companies/me"],
    ["PUT", "/companies/me"],
    ["GET", `/tors/${id}/self-check`],
  ]
  for (const [method, path] of routes) {
    assert.equal((await call(null, method, path, method === "GET" || method === "DELETE" ? undefined : {})).status, 401, `${method} ${path}`)
  }
})

// ---- notifications ----------------------------------------------------------

test("the notification list holds only your own, newest first, and hides email-only ones", async () => {
  const ana = await makeUser("ana")
  const ben = await makeUser("ben")
  await makeNotification(ana, { title: { en: "older", th: "เก่า" }, createdAt: new Date("2026-10-01") })
  await makeNotification(ana, { title: { en: "newer", th: "ใหม่" }, createdAt: new Date("2026-10-02") })
  await makeNotification(ana, { inApp: false })
  await makeNotification(ben)

  const items = await (await call(ana, "GET", "/notifications")).json()
  assert.deepEqual(items.map((item: { title: { en: string } }) => item.title.en), ["newer", "older"])
})

test("you cannot mark someone else's notification as read, and it stays unread", async () => {
  const ana = await makeUser("ana")
  const ben = await makeUser("ben")
  const note = await makeNotification(ana)

  assert.equal((await call(ben, "PATCH", `/notifications/${note._id}/read`)).status, 404)
  assert.equal((await Notification.findById(note._id))?.isRead, false)

  assert.equal((await call(ana, "PATCH", `/notifications/${note._id}/read`)).status, 200)
  assert.equal((await Notification.findById(note._id))?.isRead, true)
})

test("you cannot delete someone else's notification", async () => {
  const ana = await makeUser("ana")
  const ben = await makeUser("ben")
  const note = await makeNotification(ana)

  assert.equal((await call(ben, "DELETE", `/notifications/${note._id}`)).status, 404)
  assert.equal(await Notification.countDocuments(), 1)

  assert.equal((await call(ana, "DELETE", `/notifications/${note._id}`)).status, 204)
  assert.equal(await Notification.countDocuments(), 0)
})

test("'mark all as read' touches only your own notifications", async () => {
  const ana = await makeUser("ana")
  const ben = await makeUser("ben")
  await makeNotification(ana)
  await makeNotification(ana)
  const bens = await makeNotification(ben)

  assert.equal((await call(ana, "PATCH", "/notifications/read-all")).status, 204)
  assert.equal(await Notification.countDocuments({ userId: ana.id, isRead: false }), 0)
  assert.equal((await Notification.findById(bens._id))?.isRead, false)
})

test("a malformed notification id is a 404, not a server error", async () => {
  const ana = await makeUser("ana")
  assert.equal((await call(ana, "PATCH", "/notifications/not-an-id/read")).status, 404)
  assert.equal((await call(ana, "DELETE", "/notifications/not-an-id")).status, 404)
})

// ---- notification settings --------------------------------------------------

test("settings are kept per user, and a body naming another user cannot write to theirs", async () => {
  const ana = await makeUser("ana")
  const ben = await makeUser("ben")
  await NotificationSettings.create({ userId: ben.id, emailEnabled: true })

  const response = await call(ana, "PUT", "/notification-settings", { emailEnabled: false, userId: String(ben.id) })
  assert.equal(response.status, 200)

  assert.equal((await NotificationSettings.findOne({ userId: ana.id }))?.emailEnabled, false)
  assert.equal((await NotificationSettings.findOne({ userId: ben.id }))?.emailEnabled, true, "Ben's settings are untouched")
  assert.equal(await NotificationSettings.countDocuments(), 2)
})

test("the alert address is the account's own and cannot be redirected through settings", async () => {
  const ana = await makeUser("ana")
  const response = await call(ana, "PUT", "/notification-settings", { emailRecipient: "attacker@example.com" })
  const body = await response.json()
  assert.equal(body.accountEmail, "ana@example.com")
  assert.equal((await NotificationSettings.findOne({ userId: ana.id }))?.emailRecipient, "")
})

// ---- workspace --------------------------------------------------------------

test("the board shows only your own cards, and two users can bookmark the same TOR", async () => {
  const ana = await makeUser("ana")
  const ben = await makeUser("ben")
  const torId = await makeTor()

  assert.equal((await call(ana, "POST", "/workspace/cards", { torId: String(torId) })).status, 201)
  assert.equal((await call(ben, "POST", "/workspace/cards", { torId: String(torId) })).status, 201)
  assert.equal(await WorkspaceCard.countDocuments(), 2)

  const board = await (await call(ana, "GET", "/workspace/board")).json()
  assert.equal(board.total, 1)
})

test("bookmarking the same TOR twice keeps one card and does not move it back", async () => {
  const ana = await makeUser("ana")
  const torId = await makeTor()
  await call(ana, "POST", "/workspace/cards", { torId: String(torId) })
  const card = await WorkspaceCard.findOne({ ownerId: ana.id })
  await call(ana, "PATCH", `/workspace/cards/${card?._id}/move`, { column: "in-progress" })

  await call(ana, "POST", "/workspace/cards", { torId: String(torId) })
  assert.equal(await WorkspaceCard.countDocuments(), 1)
  assert.equal((await WorkspaceCard.findById(card?._id))?.column, "in-progress")
})

test("you cannot move, edit or delete someone else's card", async () => {
  const ana = await makeUser("ana")
  const ben = await makeUser("ben")
  const card = await WorkspaceCard.create({ ownerId: ana.id, torId: await makeTor(), column: "todo" })

  assert.equal((await call(ben, "PATCH", `/workspace/cards/${card._id}/move`, { column: "done" })).status, 404)
  assert.equal((await call(ben, "PATCH", `/workspace/cards/${card._id}`, { priority: "HIGH" })).status, 404)
  assert.equal((await call(ben, "DELETE", `/workspace/cards/${card._id}`)).status, 404)
  assert.equal((await call(ben, "DELETE", `/workspace/cards/by-tor/${card.torId}`)).status, 404)

  const stored = await WorkspaceCard.findById(card._id)
  assert.equal(stored?.column, "todo")
  assert.equal(stored?.priority, "MEDIUM")
})

test("a card cannot be handed to another user by editing it", async () => {
  const ana = await makeUser("ana")
  const ben = await makeUser("ben")
  const card = await WorkspaceCard.create({ ownerId: ana.id, torId: await makeTor() })

  await call(ana, "PATCH", `/workspace/cards/${card._id}`, { ownerId: String(ben.id), priority: "LOW" })
  const stored = await WorkspaceCard.findById(card._id)
  assert.equal(String(stored?.ownerId), String(ana.id))
  assert.equal(stored?.priority, "LOW")
})

test("adding a card validates the TOR, and moving one validates the column", async () => {
  const ana = await makeUser("ana")
  assert.equal((await call(ana, "POST", "/workspace/cards", {})).status, 400)
  assert.equal((await call(ana, "POST", "/workspace/cards", { torId: "nope" })).status, 400)
  assert.equal((await call(ana, "POST", "/workspace/cards", { torId: "64b000000000000000000000" })).status, 404)

  const card = await WorkspaceCard.create({ ownerId: ana.id, torId: await makeTor() })
  assert.equal((await call(ana, "PATCH", `/workspace/cards/${card._id}/move`, { column: "archive" })).status, 400)
  assert.equal((await WorkspaceCard.findById(card._id))?.column, "bookmark")
})

test("a card cannot be given a priority the board does not know", async () => {
  const ana = await makeUser("ana")
  const card = await WorkspaceCard.create({ ownerId: ana.id, torId: await makeTor() })

  const response = await call(ana, "PATCH", `/workspace/cards/${card._id}`, { priority: "URGENT!!" })
  assert.equal(response.status, 400)
  assert.equal((await WorkspaceCard.findById(card._id))?.priority, "MEDIUM")
})

test("the board drops cards whose TOR has been removed", async () => {
  const ana = await makeUser("ana")
  const kept = await makeTor()
  const gone = await makeTor()
  await WorkspaceCard.create({ ownerId: ana.id, torId: kept })
  await WorkspaceCard.create({ ownerId: ana.id, torId: gone })
  await Tor.collection.deleteOne({ _id: gone })

  const board = await (await call(ana, "GET", "/workspace/board")).json()
  assert.equal(board.total, 1)
  assert.equal(await WorkspaceCard.countDocuments(), 1, "the orphan is cleaned up")
})

// ---- company profile ----------------------------------------------------------

test("a user with no profile yet gets null, not someone else's", async () => {
  const ana = await makeUser("ana")
  const ben = await makeUser("ben")
  await Company.create({ ownerId: ben.id, companyNameThai: "บริษัทเบน" })

  assert.equal(await (await call(ana, "GET", "/companies/me")).json(), null)
})

test("saving a profile creates it for the caller as pending, whatever the body says about owner and status", async () => {
  const ana = await makeUser("ana")
  const ben = await makeUser("ben")

  const response = await call(ana, "PUT", "/companies/me", {
    companyNameThai: "บริษัทอานา",
    ownerId: String(ben.id),
    status: "active",
  })
  assert.equal(response.status, 200)

  assert.equal(await Company.countDocuments({ ownerId: ben.id }), 0)
  const stored = await Company.findOne({ ownerId: ana.id })
  assert.equal(stored?.companyNameThai, "บริษัทอานา")
  assert.equal(stored?.status, "pending", "a user cannot approve their own company")
})

test("saving again keeps the status an admin set and leaves other users' profiles alone", async () => {
  const ana = await makeUser("ana")
  const ben = await makeUser("ben")
  await Company.create({ ownerId: ana.id, companyNameThai: "เดิม", status: "active" })
  await Company.create({ ownerId: ben.id, companyNameThai: "ของเบน", status: "active" })

  await call(ana, "PUT", "/companies/me", { companyNameThai: "ใหม่", status: "suspended" })

  assert.equal((await Company.findOne({ ownerId: ana.id }))?.status, "active")
  assert.equal((await Company.findOne({ ownerId: ana.id }))?.companyNameThai, "ใหม่")
  assert.equal((await Company.findOne({ ownerId: ben.id }))?.companyNameThai, "ของเบน")
})

test("a field left out of a save is kept, and an unknown one is ignored", async () => {
  const ana = await makeUser("ana")
  await Company.create({ ownerId: ana.id, companyNameThai: "เดิม", taxId: "0105550000001", techStack: ["Node"] })

  await call(ana, "PUT", "/companies/me", { phone: "02-000-0000", isAdmin: true })

  const stored = await Company.findOne({ ownerId: ana.id }).lean()
  assert.equal(stored?.companyNameThai, "เดิม")
  assert.equal(stored?.taxId, "0105550000001")
  assert.deepEqual(stored?.techStack, ["Node"])
  assert.equal(stored?.phone, "02-000-0000")
  assert.equal("isAdmin" in (stored ?? {}), false)
})

test("a profile body that is not an object is treated as empty rather than crashing", async () => {
  const ana = await makeUser("ana")
  const response = await fetch(`${base}/companies/me`, {
    method: "PUT",
    headers: { authorization: `Bearer ${ana.token}`, "content-type": "application/json" },
    body: JSON.stringify(["not", "an", "object"]),
  })
  assert.ok(response.status < 500, `got ${response.status}`)
})
