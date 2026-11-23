import { cookies } from "next/headers"

import { hostCookieName } from "@/lib/cookie-names"

export const USER_IDLE_TIMEOUT_SECONDS =
  Number(process.env.USER_IDLE_TIMEOUT_SECONDS ?? 30 * 60)

export const USER_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export const USER_SESSION_COOKIE = hostCookieName("tm_user_session")

export type UserSession = {
  userId: string
  email: string
  role: "user" | "admin"
  issuedAt: number
  lastActiveAt: number
}

export type UserSessionCookieOptions = {
  httpOnly: true
  secure: boolean
  sameSite: "lax"
  path: "/"
  maxAge: number
}

function getSessionSecret() {
  const secret =
    process.env.USER_SESSION_SECRET || process.env.JWT_SECRET || process.env.ADMIN_SESSION_SECRET
  if (secret) return secret

  // The fallback below is public in source control: anyone could sign a cookie with it.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "USER_SESSION_SECRET must be set in production — the development fallback is public in source control"
    )
  }
  return "dev-user-session-secret-change-me"
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
  let expected: string
  try {
    expected = await signPayload(payload)
  } catch (error) {
    // No usable secret (production without USER_SESSION_SECRET): nothing can be
    // verified, so nothing is accepted. Signing in still fails loudly.
    console.error("[user-session]", error instanceof Error ? error.message : error)
    return false
  }
  if (expected.length !== signature.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return mismatch === 0
}

export function userSessionCookieOptions(
  maxAge = USER_IDLE_TIMEOUT_SECONDS
): UserSessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  }
}

export async function encodeUserSession(session: UserSession): Promise<string> {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(session)))
  const signature = await signPayload(payload)
  return `${payload}.${signature}`
}

/**
 * Reads the claims of a backend JWT WITHOUT checking its signature: the frontend
 * does not hold the backend's signing key. Fine for a token the backend has just
 * handed over (login, Google callback) and for deciding whether to bother
 * sending a stored token to the API, which verifies it. Never use it to decide
 * that someone is signed in: a cookie is client-controlled, so anyone can write
 * one. That is what the signed session cookie is for ({@link decodeUserSession}).
 */
export function decodeUserToken(token: string | undefined | null): UserSession | null {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 3) return null
  try {
    const json = new TextDecoder().decode(fromBase64Url(parts[1]))
    const payload = JSON.parse(json) as Record<string, unknown>

    const sub = typeof payload.sub === "string" ? payload.sub : ""
    const email = typeof payload.email === "string" ? payload.email : ""
    const role = (payload.role === "admin" ? "admin" : "user") as "user" | "admin"
    const lastActiveAt =
      typeof payload.lastActiveAt === "number"
        ? payload.lastActiveAt
        : typeof payload.iat === "number"
          ? payload.iat * 1000
          : Date.now()
    const issuedAt =
      typeof payload.issuedAt === "number"
        ? payload.issuedAt
        : typeof payload.iat === "number"
          ? payload.iat * 1000
          : Date.now()

    return {
      userId: sub,
      email,
      role,
      issuedAt,
      lastActiveAt,
    }
  } catch {
    return null
  }
}

export async function decodeUserSession(
  token: string | undefined | null,
  maxIdleSeconds = USER_IDLE_TIMEOUT_SECONDS
): Promise<UserSession | null> {
  if (!token) return null

  // Only the session cookie this app signed itself (payload.signature) counts. A
  // three-part JWT is not accepted here: its signature cannot be checked on this
  // side, so a forged one would pass for a signed-in user (ASVS V9.1.1, V7.2.1).
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [payload, signature] = parts
  if (!payload || !signature) return null
  if (!(await verifySignature(payload, signature))) return null

  try {
    const json = new TextDecoder().decode(fromBase64Url(payload))
    const session = JSON.parse(json) as UserSession
    if (
      typeof session.userId !== "string" ||
      typeof session.email !== "string" ||
      typeof session.issuedAt !== "number" ||
      typeof session.lastActiveAt !== "number"
    ) {
      return null
    }

    if (isUserSessionExpired(session, maxIdleSeconds)) {
      return null
    }

    return session
  } catch {
    return null
  }
}

export function isUserSessionExpired(
  session: UserSession | null,
  maxIdleSeconds = USER_IDLE_TIMEOUT_SECONDS
): boolean {
  if (!session) return true
  const now = Date.now()
  // Inactivity timeout check (sliding window)
  if (now - session.lastActiveAt > maxIdleSeconds * 1000) {
    return true
  }
  // Absolute max age check (7 days)
  if (now - session.issuedAt > USER_SESSION_MAX_AGE_SECONDS * 1000) {
    return true
  }
  return false
}

export function touchUserSession(session: UserSession): UserSession {
  return {
    ...session,
    lastActiveAt: Date.now(),
  }
}

export async function getUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies()
  return decodeUserSession(cookieStore.get(USER_SESSION_COOKIE)?.value)
}

export async function setUserSessionCookie(session: UserSession) {
  const cookieStore = await cookies()
  cookieStore.set(
    USER_SESSION_COOKIE,
    await encodeUserSession(session),
    userSessionCookieOptions()
  )
}

export async function clearUserSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.set(USER_SESSION_COOKIE, "", {
    ...userSessionCookieOptions(0),
    maxAge: 0,
  })
}
