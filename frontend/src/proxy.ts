import { NextResponse, type NextRequest } from "next/server"

import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  decodeAdminSession,
  encodeAdminSession,
  touchAdminSession,
} from "@/lib/admin-session"

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

const AUTH_PAGES = ["/login", "/signup"]

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Presence-only gate for the regular-user auth cookie: this only checks
 * whether it exists, it does not verify the JWT signature (proxy runs on
 * the edge and shouldn't own that trust boundary). The backend still
 * verifies the token on every API call via requireAuth — this just avoids
 * flashing protected pages at signed-out visitors.
 */
function handleUserAuth(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl
  const isSignedIn = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value)

  if (matchesPrefix(pathname, PROTECTED_PREFIXES) && !isSignedIn) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirectTo", pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  if (matchesPrefix(pathname, AUTH_PAGES) && isSignedIn) {
    return NextResponse.redirect(new URL("/browse", request.url))
  }

  return null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith("/admin")) {
    return handleUserAuth(request) ?? NextResponse.next()
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
  ],
}
