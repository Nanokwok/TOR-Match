import test, { after, afterEach, before } from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"
import bcrypt from "bcryptjs"

import { createApp } from "../src/app"
import { env } from "../src/config/env"
import { User } from "../src/models/User.model"
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

async function post(path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

const sessionCookie = (response: Response) =>
  response.headers.getSetCookie().find((cookie) => cookie.startsWith(`${env.authCookieName}=`))

const ana = { name: "Ana", email: "ana@example.com", password: "correct horse battery" }

test("registering creates the account, signs the user in and never stores the password", async () => {
  const response = await post("/auth/register", ana)
  assert.equal(response.status, 201)
  const body = await response.json()
  assert.equal(body.user.email, "ana@example.com")
  assert.equal(body.user.role, "user")
  assert.ok(body.token)
  assert.equal(body.user.passwordHash, undefined, "the hash is not sent back")

  const cookie = sessionCookie(response)
  assert.ok(cookie, "a session cookie is set")
  assert.match(cookie, /HttpOnly/i)

  const stored = await User.findOne({ email: "ana@example.com" }).select("+passwordHash")
  assert.ok(stored?.passwordHash)
  assert.notEqual(stored.passwordHash, ana.password)
  assert.equal(await bcrypt.compare(ana.password, stored.passwordHash), true)
})

test("an email is stored in lower case and cannot be registered twice in another case", async () => {
  await post("/auth/register", { ...ana, email: "Ana@Example.com" })
  assert.ok(await User.findOne({ email: "ana@example.com" }))
  const again = await post("/auth/register", ana)
  assert.equal(again.status, 409)
  assert.equal(await User.countDocuments(), 1)
})

test("registering refuses a short password, a bad email and a blank name", async () => {
  for (const bad of [{ ...ana, password: "short" }, { ...ana, email: "not-an-email" }, { ...ana, name: "  " }]) {
    assert.equal((await post("/auth/register", bad)).status, 400)
  }
  assert.equal(await User.countDocuments(), 0)
})

test("logging in with the right password returns a token that works", async () => {
  await post("/auth/register", ana)
  const response = await post("/auth/login", { email: "ANA@example.com", password: ana.password })
  assert.equal(response.status, 200)
  const { token } = await response.json()
  assert.ok(sessionCookie(response))

  const me = await fetch(`${base}/auth/me`, { headers: { authorization: `Bearer ${token}` } })
  assert.equal(me.status, 200)
  assert.equal((await me.json()).user.email, "ana@example.com")
})

test("a wrong password and an unknown email get the same answer, so accounts cannot be probed", async () => {
  await post("/auth/register", ana)
  const wrong = await post("/auth/login", { email: ana.email, password: "not the password" })
  const unknown = await post("/auth/login", { email: "nobody@example.com", password: ana.password })
  assert.equal(wrong.status, 401)
  assert.equal(unknown.status, 401)
  assert.equal((await wrong.json()).error, (await unknown.json()).error)
  assert.equal(sessionCookie(wrong), undefined)
})

test("an account created through Google has no password, and logging in with one points to Google", async () => {
  await User.create({ name: "Gus", email: "gus@example.com", googleId: "g-123" })
  const response = await post("/auth/login", { email: "gus@example.com", password: "anything at all" })
  assert.equal(response.status, 401)
  assert.match((await response.json()).error, /Google/)
})

test("/auth/me needs a session: none, a forged token and a valid one", async () => {
  assert.equal((await fetch(`${base}/auth/me`)).status, 401)

  const forged = await fetch(`${base}/auth/me`, { headers: { authorization: "Bearer not.a.token" } })
  assert.equal(forged.status, 401)

  const user = await User.create({ name: "Ana", email: "a@example.com", passwordHash: "x" })
  const token = signAuthToken({ sub: String(user._id), email: user.email, role: "user" })
  const ok = await fetch(`${base}/auth/me`, { headers: { cookie: `${env.authCookieName}=${token}` } })
  assert.equal(ok.status, 200)
})

test("a token for an account that no longer exists is not a session", async () => {
  const token = signAuthToken({ sub: "64b000000000000000000000", email: "gone@example.com", role: "user" })
  const response = await fetch(`${base}/auth/me`, { headers: { authorization: `Bearer ${token}` } })
  assert.equal(response.status, 401)
})

test("logging out clears the session cookie", async () => {
  const response = await post("/auth/logout", {})
  assert.equal(response.status, 204)
  assert.match(sessionCookie(response) ?? "", /Expires=Thu, 01 Jan 1970|Max-Age=0/i)
})

test("admin routes turn away signed-out visitors (401) and ordinary users (403), and let admins in", async () => {
  const path = `${base}/companies/admin/stats`
  assert.equal((await fetch(path)).status, 401)

  const user = await User.create({ name: "U", email: "u@example.com", passwordHash: "x", role: "user" })
  const asUser = signAuthToken({ sub: String(user._id), email: user.email, role: "user" })
  assert.equal((await fetch(path, { headers: { authorization: `Bearer ${asUser}` } })).status, 403)

  const admin = await User.create({ name: "A", email: "adm@example.com", passwordHash: "x", role: "admin" })
  const asAdmin = signAuthToken({ sub: String(admin._id), email: admin.email, role: "admin" })
  assert.equal((await fetch(path, { headers: { authorization: `Bearer ${asAdmin}` } })).status, 200)
})
