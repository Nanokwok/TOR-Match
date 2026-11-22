import "server-only"

import { hostCookieName } from "@/lib/cookie-names"
import { required } from "@/lib/env"

/** Prefixed in production (see cookie-names.ts), so every reader must use this, not the raw variable. */
export const AUTH_COOKIE_NAME = hostCookieName(required("AUTH_COOKIE_NAME"))
/** Matches backend/src/controllers/auth.controller.ts. */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

/** `rememberMe: false` makes it a session cookie, cleared when the browser closes. */
export function authCookieOptions(rememberMe = true) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(rememberMe ? { maxAge: SESSION_MAX_AGE_SECONDS } : {}),
  }
}
