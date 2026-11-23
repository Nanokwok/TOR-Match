import "server-only"

import { hostCookieName } from "@/lib/cookie-names"

/** Holds the one-time value that must come back from Google unchanged. */
export const GOOGLE_STATE_COOKIE = hostCookieName("tm_google_state")

export function googleStateCookieOptions(maxAge = 10 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax so it is sent when Google redirects the browser back to us.
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  }
}
