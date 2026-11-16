import { NextResponse, type NextRequest } from "next/server"

import {
  ADMIN_API_TOKEN_COOKIE,
  ADMIN_SESSION_COOKIE,
  adminApiTokenCookieOptions,
  adminSessionCookieOptions,
  decodeAdminSession,
  encodeAdminSession,
  touchAdminSession,
} from "@/lib/admin-session"
import {
  USER_SESSION_COOKIE,
  decodeUserSession,
  encodeUserSession,
  isUserSessionExpired,
  touchUserSession,
  userSessionCookieOptions,
} from "@/lib/user-session"

// Kept in sync with backend/src/config/env.ts's AUTH_COOKIE_NAME default.
// Not read via lib/env's required() here: proxy runs on every request, so a
// missing env var must degrade to the default rather than 500 the site.
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "tm_token"

// Route groups (main) — everything a signed-in user reaches after auth.
const PROTECTED_PREFIXES = [
  "/browse",
  "/company-profile",
  "/company-setup",
  "/dashboard",
  "/eligibility",
  "/settings",
  "/workspace",
]

const AUTH_PAGES = ["/login", "/signup", "/forgot-password"]

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Validates regular-user session freshness and enforces idle inactivity timeout.
 * Redirects expired or unauthenticated sessions to /login?redirectTo=... while
 * updating the sliding window on active interactions.
 */
async function handleUserAuth(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  const userSessionToken = request.cookies.get(USER_SESSION_COOKIE)?.value
  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value

  const rawToken = userSessionToken ?? authToken
  const session = await decodeUserSession(rawToken)
  const isExpired = !session || isUserSessionExpired(session)
  const isSignedIn = Boolean(session && !isExpired)

  if (matchesPrefix(pathname, PROTECTED_PREFIXES) && !isSignedIn) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirectTo", pathname + request.nextUrl.search)
    const response = NextResponse.redirect(loginUrl)
    if (authToken || userSessionToken) {
      response.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 })
      response.cookies.set(USER_SESSION_COOKIE, "", { path: "/", maxAge: 0 })
    }
    return response
  }

  if (matchesPrefix(pathname, AUTH_PAGES) && isSignedIn) {
    return NextResponse.redirect(new URL("/browse", request.url))
  }

  // Active interaction on protected route: slide expiration window
  if (session && isSignedIn && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const refreshed = touchUserSession(session)
    const response = NextResponse.next()
    response.cookies.set(
      USER_SESSION_COOKIE,
      await encodeUserSession(refreshed),
      userSessionCookieOptions()
    )
    return response
  }

  return null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith("/admin")) {
    return (await handleUserAuth(request)) ?? NextResponse.next()
  }

  const isLoginPage = pathname === "/admin/login"
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const session = await decodeAdminSession(token)

  if (!session && !isLoginPage) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/admin/login"
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (session && isLoginPage) {
    const overviewUrl = request.nextUrl.clone()
    overviewUrl.pathname = "/admin/overview"
    overviewUrl.search = ""
    return NextResponse.redirect(overviewUrl)
  }

  const response = NextResponse.next()

  // Sliding expiry: refresh lastActive + cookie maxAge on each admin request.
  if (session) {
    const refreshed = touchAdminSession(session)
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      await encodeAdminSession(refreshed),
      adminSessionCookieOptions()
    )

    const apiToken = request.cookies.get(ADMIN_API_TOKEN_COOKIE)?.value
    if (apiToken) {
      response.cookies.set(
        ADMIN_API_TOKEN_COOKIE,
        apiToken,
        adminApiTokenCookieOptions()
      )
    }
  }

  return response
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/browse/:path*",
    "/company-profile/:path*",
    "/company-setup/:path*",
    "/dashboard/:path*",
    "/eligibility/:path*",
    "/settings/:path*",
    "/workspace/:path*",
    "/login",
    "/signup",
    "/forgot-password",
  ],
}
