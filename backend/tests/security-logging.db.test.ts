import test, { after, afterEach, before } from "node:test"
import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"
import bcrypt from "bcryptjs"

import { createApp } from "../src/app"
import { generateResetToken, PASSWORD_RESET_TTL_MS } from "../src/domain/password-reset"
import { PasswordResetToken } from "../src/models/PasswordResetToken.model"
import { User } from "../src/models/User.model"
import { signAuthToken } from "../src/utils/jwt"
import { startMemoryDb } from "./helpers/memory-db"

let db: Awaited<ReturnType<typeof startMemoryDb>>
let server: Server
let base: string
const realFetch = globalThis.fetch

before(async () => {
  db = await startMemoryDb()
  server = createApp().listen(0)
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
  // The breached-password lookup is the only call that would leave the machine; answer it with "not breached".
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
    String(input).includes("pwnedpasswords") ? new Response("") : realFetch(input, init)) as typeof fetch
})

afterEach(() => db.clear())

after(async () => {
  globalThis.fetch = realFetch
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await db.stop()
})

const OLD_PASSWORD = "old password 123"
const NEW_PASSWORD = "brand new password 456"

/** Runs `action` and returns every line the app logged while it ran. */
async function logged(action: () => Promise<unknown>): Promise<string> {
  const lines: string[] = []
  const original = console.log
  console.log = (...args: unknown[]) => void lines.push(args.map(String).join(" "))
  try {
    await action()
  } finally {
    console.log = original
  }
  return lines.join("\n")
}

async function makeUser() {
  const user = await User.create({
    name: "Vendor",
    email: "vendor@example.com",
    passwordHash: await bcrypt.hash(OLD_PASSWORD, 4),
  })
  const token = signAuthToken({ sub: String(user._id), email: user.email, role: "user", tokenVersion: 0 })
  return { user, token }
}

const post = (path: string, body: unknown, token?: string) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })

test("a forgot-password request is logged, for known and unknown addresses alike", async () => {
  await makeUser()
  const output = await logged(async () => {
    await post("/auth/forgot-password", { email: "vendor@example.com" })
    await post("/auth/forgot-password", { email: "nobody@example.com" })
  })

  assert.match(output, /AUTH_PASSWORD_RESET_REQUESTED \(user: vendor@example\.com\)/)
  assert.match(output, /AUTH_PASSWORD_RESET_REQUESTED \(user: nobody@example\.com\)/)
})

test("a reset with a bad link is logged as a failure, and the token is not in the log", async () => {
  const badToken = "x".repeat(43)
  let status = 0
  const output = await logged(async () => {
    status = (await post("/auth/reset-password", { token: badToken, password: NEW_PASSWORD })).status
  })

  assert.equal(status, 400)
  assert.match(output, /AUTH_PASSWORD_RESET_FAILED/)
  assert.equal(output.includes(badToken), false)
  assert.equal(output.includes(NEW_PASSWORD), false)
})

test("a successful reset is logged as a password change for that user", async () => {
  const { user } = await makeUser()
  const { token, tokenHash } = generateResetToken()
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  })

  let status = 0
  const output = await logged(async () => {
    status = (await post("/auth/reset-password", { token, password: NEW_PASSWORD })).status
  })

  assert.equal(status, 200)
  assert.match(output, new RegExp(`PASSWORD_CHANGED \\(id: ${user._id}\\)`))
  assert.equal(output.includes(token), false)
  assert.equal(output.includes(NEW_PASSWORD), false)
})

test("a successful password change is logged, and the passwords are not", async () => {
  const { token } = await makeUser()
  let status = 0
  const output = await logged(async () => {
    status = (await post("/auth/change-password", { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD }, token)).status
  })

  assert.equal(status, 200)
  assert.match(output, /PASSWORD_CHANGED \(user: vendor@example\.com\)/)
  assert.equal(output.includes(OLD_PASSWORD), false)
  assert.equal(output.includes(NEW_PASSWORD), false)
})

test("a password change with the wrong current password is logged as a failure", async () => {
  const { token } = await makeUser()
  let status = 0
  const output = await logged(async () => {
    status = (await post("/auth/change-password", { currentPassword: "not my password", newPassword: NEW_PASSWORD }, token)).status
  })

  assert.equal(status, 400)
  assert.match(output, /PASSWORD_CHANGE_FAILED \(user: vendor@example\.com\)/)
  assert.equal(output.includes("not my password"), false)
})
