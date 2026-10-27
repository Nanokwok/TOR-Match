import { cookies } from "next/headers"

export const USER_IDLE_TIMEOUT_SECONDS =
  Number(process.env.USER_IDLE_TIMEOUT_SECONDS ?? 30 * 60)

export const USER_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export const USER_SESSION_COOKIE = "tm_user_session"
export const USER_AUTH_COOKIE = process.env.AUTH_COOKIE_NAME ?? "tm_token"

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
  return (
    process.env.USER_SESSION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    "dev-user-session-secret-change-me"
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

  // Case 1: HMAC-signed session string (payload.signature)
  const parts = token.split(".")
  if (parts.length === 2) {
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

  // Case 2: Standard 3-part JWT
  if (parts.length === 3) {
    const session = decodeUserToken(token)
    if (!session) return null
    if (isUserSessionExpired(session, maxIdleSeconds)) {
      return null
    }
    return session
  }

  return null
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
  const sessionVal =
    cookieStore.get(USER_SESSION_COOKIE)?.value ??
    cookieStore.get(USER_AUTH_COOKIE)?.value
  return decodeUserSession(sessionVal)
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
