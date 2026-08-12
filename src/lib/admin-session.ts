import { cookies } from "next/headers"

/** Admin inactivity timeout — shorter than regular user sessions. */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 30 * 60

/** Regular user session lifetime (for comparison / future user auth). */
export const USER_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export const ADMIN_SESSION_COOKIE = "tm_admin_session"

export type AdminSession = {
  email: string
  name: string
  issuedAt: number
  lastActiveAt: number
}

export type AdminSessionCookieOptions = {
  httpOnly: true
  secure: boolean
  sameSite: "strict"
  path: "/admin"
  maxAge: number
}

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    "dev-admin-session-secret-change-me"
  )
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function signPayload(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  )
  return toBase64Url(new Uint8Array(signature))
}

async function verifySignature(payload: string, signature: string) {
  const expected = await signPayload(payload)
  if (expected.length !== signature.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return mismatch === 0
}

export function adminSessionCookieOptions(
  maxAge = ADMIN_SESSION_MAX_AGE_SECONDS
): AdminSessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge,
  }
}

export async function encodeAdminSession(session: AdminSession) {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(session)))
  const signature = await signPayload(payload)
  return `${payload}.${signature}`
}

export async function decodeAdminSession(
  token: string | undefined | null
): Promise<AdminSession | null> {
  if (!token) return null
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null
  if (!(await verifySignature(payload, signature))) return null

  try {
    const json = new TextDecoder().decode(fromBase64Url(payload))
    const session = JSON.parse(json) as AdminSession
    if (
      typeof session.email !== "string" ||
      typeof session.name !== "string" ||
      typeof session.issuedAt !== "number" ||
      typeof session.lastActiveAt !== "number"
    ) {
      return null
    }

    const now = Date.now()
    if (now - session.lastActiveAt > ADMIN_SESSION_MAX_AGE_SECONDS * 1000) {
      return null
    }

    return session
  } catch {
    return null
  }
}

export function touchAdminSession(session: AdminSession): AdminSession {
  return {
    ...session,
    lastActiveAt: Date.now(),
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  return decodeAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)
}

export async function setAdminSessionCookie(session: AdminSession) {
  const cookieStore = await cookies()
  cookieStore.set(
    ADMIN_SESSION_COOKIE,
    await encodeAdminSession(session),
    adminSessionCookieOptions()
  )
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionCookieOptions(0),
    maxAge: 0,
  })
}

export function getAdminCredentials() {
  return {
    email: process.env.ADMIN_EMAIL || "admin@example.com",
    password: process.env.ADMIN_PASSWORD || "admin123",
    name: process.env.ADMIN_NAME || "Admin",
  }
}
