import { NextResponse, type NextRequest } from "next/server"

import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  decodeAdminSession,
  encodeAdminSession,
  touchAdminSession,
} from "@/lib/admin-session"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next()
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
  matcher: ["/admin/:path*"],
}
