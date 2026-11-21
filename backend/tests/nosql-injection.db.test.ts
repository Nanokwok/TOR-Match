import test, { after, afterEach, before, mock } from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"

import { createApp } from "../src/app"
import { Company } from "../src/models/Company.model"
import { Tor } from "../src/models/Tor.model"
import { User } from "../src/models/User.model"
import { WorkspaceCard } from "../src/models/WorkspaceCard.model"
import { HIBP_RANGE_API_URL } from "../src/services/pwned-password.service"
import { signAuthToken } from "../src/utils/jwt"
import { startMemoryDb } from "./helpers/memory-db"

/**
 * What an attacker sends: MongoDB operators where a string belongs. Each must be
 * refused with a 400 (never a 500, and never answered as if the operator were a
 * real question), and nothing may be written.
 */

let db: Awaited<ReturnType<typeof startMemoryDb>>
let server: Server
let base: string

before(async () => {
  db = await startMemoryDb()
  server = createApp().listen(0)
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
})

afterEach(async () => {
  mock.restoreAll()
  await db.clear()
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await db.stop()
})

async function makeUser(role: "user" | "admin" = "user") {
  const user = await User.create({ name: role, email: `${role}@example.com`, passwordHash: "x", role })
  return { id: user._id, token: signAuthToken({ sub: String(user._id), email: user.email, role }) }
}

function call(token: string | null, method: string, path: string, body?: unknown) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function makeTor(overrides: Record<string, unknown> = {}) {
  const inserted = await Tor.collection.insertOne({
    announcementNo: `no-${Math.random().toString(36).slice(2, 8)}`,
    title: { en: "Portal", th: "พอร์ทัล" },
    department: { en: "Dept", th: "สำนัก" },
    status: "open",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })
  return inserted.insertedId
}

test("a normal TOR search still works", async () => {
  await makeTor()
  await makeTor({ status: "closed" })
  const response = await call(null, "GET", "/tors?status=open&keyword=portal")
  assert.equal(response.status, 200)
  assert.equal((await response.json()).total, 1)
})

test("GET /tors refuses an operator in a filter instead of running it", async () => {
  await makeTor()
  await makeTor({ status: "closed" })

  // Run as written, `status[$ne]=open` would list every TOR that is not open.
  for (const query of [
    "status[$ne]=open",
    "department[$regex]=.*",
    "keyword[$gt]=",
    "budgetRange[$ne]=x",
    "status[$where]=1",
  ]) {
    const response = await call(null, "GET", `/tors?${encodeURI(query)}`)
    assert.equal(response.status, 400, query)
  }
})

test("GET /tors refuses a filter given twice or as a list", async () => {
  assert.equal((await call(null, "GET", "/tors?status=open&status=closed")).status, 400)
  assert.equal((await call(null, "GET", "/tors?keyword[]=a")).status, 400)
})

test("the admin draft list refuses operators too", async () => {
  const admin = await makeUser("admin")
  assert.equal((await call(admin.token, "GET", "/tor-drafts?reviewStatus[$ne]=approved")).status, 400)
  assert.equal((await call(admin.token, "GET", "/tor-drafts?department=x&department=y")).status, 400)
  assert.equal((await call(admin.token, "GET", "/tor-drafts?reviewStatus=pending")).status, 200)
})

test("login with an operator in place of the email or password is refused", async () => {
  const response = await call(null, "POST", "/auth/login", { email: { $gt: "" }, password: { $gt: "" } })
  assert.equal(response.status, 400)
})

test("registration with an operator in place of a field is refused and creates nothing", async () => {
  const response = await call(null, "POST", "/auth/register", { name: "x", email: { $ne: null }, password: "a long enough password" })
  assert.equal(response.status, 400)
  assert.equal(await User.countDocuments(), 0)
})

test("registration refuses a password longer than bcrypt can use", async () => {
  const realFetch = globalThis.fetch
  mock.method(globalThis, "fetch", (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
    String(input).startsWith(HIBP_RANGE_API_URL) ? Promise.resolve(new Response("")) : realFetch(input, init)
  )

  const tooLong = await call(null, "POST", "/auth/register", { name: "Ana", email: "ana@example.com", password: "ก".repeat(25) })
  assert.equal(tooLong.status, 400)
  assert.equal(await User.countDocuments(), 0)

  const fits = await call(null, "POST", "/auth/register", { name: "Ana", email: "ana@example.com", password: "ก".repeat(24) })
  assert.equal(fits.status, 201)
})

test("adding a card with an operator, a bad id, or an unknown column is refused and stores nothing", async () => {
  const ana = await makeUser()
  const torId = String(await makeTor())

  for (const body of [
    { torId: { $ne: null } },
    { torId: "not-an-id" },
    {},
    { torId, column: "bogus" },
    { torId, column: { $ne: "" } },
    { torId, priority: "URGENT" },
  ]) {
    assert.equal((await call(ana.token, "POST", "/workspace/cards", body)).status, 400, JSON.stringify(body))
  }
  assert.equal(await WorkspaceCard.countDocuments(), 0)

  assert.equal((await call(ana.token, "POST", "/workspace/cards", { torId })).status, 201)
})

test("updating a card refuses operators, wrong shapes and path-like keys, and leaves the card alone", async () => {
  const ana = await makeUser()
  const torId = String(await makeTor())
  const card = await (await call(ana.token, "POST", "/workspace/cards", { torId })).json()
  const path = `/workspace/cards/${card._id}`

  for (const body of [
    { priority: { $ne: "LOW" } },
    { column: "bogus" },
    { assigneeIds: "someone" },
    { assigneeIds: [{ $ne: null }] },
    { assigneeIds: ["not-an-id"] },
    { checklist: "todo" },
    { checklist: [{ label: { $gt: "" } }] },
    { checklist: [{ label: "ok", completed: "yes" }] },
    { checklist: [{ "$set": { role: "admin" }, label: "x" }] },
    { "checklist.0.label": "x" },
  ]) {
    assert.equal((await call(ana.token, "PATCH", path, body)).status, 400, JSON.stringify(body))
  }

  const stored = await WorkspaceCard.findById(card._id)
  assert.equal(stored?.priority, "MEDIUM")
  assert.equal(stored?.column, "bookmark")
  assert.equal(stored?.checklist.length, 0)
})

test("a card update with the shape the web app sends still works", async () => {
  const ana = await makeUser()
  const torId = String(await makeTor())
  const card = await (await call(ana.token, "POST", "/workspace/cards", { torId })).json()

  const response = await call(ana.token, "PATCH", `/workspace/cards/${card._id}`, {
    priority: "HIGH",
    column: "todo",
    assigneeIds: [String(ana.id)],
    checklist: [{ id: `${torId}-cl-1`, label: "Prepare ISO certificate", completed: true }],
  })
  assert.equal(response.status, 200)
  const stored = await WorkspaceCard.findById(card._id)
  assert.equal(stored?.priority, "HIGH")
  assert.equal(stored?.column, "todo")
  assert.equal(stored?.checklist[0]?.label, "Prepare ISO certificate")
})

test("saving the company profile with an operator or an object for a text field is refused", async () => {
  const ana = await makeUser()

  assert.equal((await call(ana.token, "PUT", "/companies/me", { companyNameThai: { $ne: "" } })).status, 400)
  // No operator here, but an object where a string belongs: the database layer rejects it, and so do we, with a 400.
  assert.equal((await call(ana.token, "PUT", "/companies/me", { taxId: { nested: "object" } })).status, 400)
  assert.equal((await call(ana.token, "PUT", "/companies/me", { "certifications.0": "x" })).status, 400)
  assert.equal(await Company.countDocuments(), 0)
})

test("a malformed id in the path is a not-found or a bad request, never a server error", async () => {
  const ana = await makeUser()
  const admin = await makeUser("admin")

  for (const [token, method, path] of [
    [null, "GET", "/tors/not-an-id"],
    [ana.token, "GET", "/tors/not-an-id/qualification"],
    [ana.token, "GET", "/tors/not-an-id/self-check"],
    [ana.token, "PATCH", "/workspace/cards/not-an-id"],
    [ana.token, "DELETE", "/workspace/cards/by-tor/not-an-id"],
    [ana.token, "PATCH", "/notifications/not-an-id/read"],
    [admin.token, "GET", "/companies/admin/not-an-id"],
    [admin.token, "GET", "/tor-drafts/not-an-id"],
  ] as const) {
    const response = await call(token, method, path, method === "PATCH" ? {} : undefined)
    assert.ok([400, 404].includes(response.status), `${method} ${path} answered ${response.status}`)
  }
})
