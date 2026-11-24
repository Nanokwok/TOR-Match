import { NextResponse } from "next/server"

import { ApiRequestError, apiFetch } from "@/lib/api-client"
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie"
import { CLEAR_SITE_DATA } from "@/lib/clear-site-data"
import { expiredRootCookieOptions } from "@/lib/cookie-names"
import { USER_SESSION_COOKIE } from "@/lib/user-session"

/**
 * Signs the user out: ends the session at the API, expires the cookies and tells
 * the browser to clear what it holds for this site. This is a route handler
 * rather than a server action because only a response of its own can carry the
 * header. Callers also clear storage themselves (lib/sign-out.ts), for when this
 * request never arrives.
 */
export async function POST() {
  try {
    await apiFetch("/auth/logout", { method: "POST" })
  } catch (error) {
    // Best effort: the cookies are expired below regardless, so a failed API call
    // (an already-expired token, say) must not keep the user signed in here.
    if (!(error instanceof ApiRequestError)) console.error("logout: API call failed", error)
  }

  const response = new NextResponse(null, { status: 204 })
  response.headers.set("Clear-Site-Data", CLEAR_SITE_DATA)
  response.headers.set("Cache-Control", "no-store")
  response.cookies.set(AUTH_COOKIE_NAME, "", expiredRootCookieOptions())
  response.cookies.set(USER_SESSION_COOKIE, "", expiredRootCookieOptions())
  return response
}
