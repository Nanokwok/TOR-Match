import { NextResponse, type NextRequest } from "next/server"

import { ApiRequestError, apiFetch } from "@/lib/api-client"
import { AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/auth-cookie"
import { GOOGLE_STATE_COOKIE } from "@/lib/google-auth"

type GoogleSignInResponse = { token: string; created: boolean }

function backToLogin(request: NextRequest, reason: string) {
  const url = new URL("/login", request.url)
  url.searchParams.set("error", reason)
  const response = NextResponse.redirect(url)
  response.cookies.delete(GOOGLE_STATE_COOKIE)
  return response
}

/**
 * Where Google sends the browser back to. Checks the state we set, trades the
 * one-time code for a session through the backend, and signs the user in.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const code = params.get("code")
  const state = params.get("state")
  const expected = request.cookies.get(GOOGLE_STATE_COOKIE)?.value

  // The user pressed "Cancel" on Google's page, or Google refused.
  if (params.get("error")) return backToLogin(request, "google-cancelled")
  if (!code || !state || !expected || state !== expected) return backToLogin(request, "google-failed")

  try {
    const data = await apiFetch<GoogleSignInResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ code }),
      auth: false,
    })
    const response = NextResponse.redirect(new URL("/browse", request.url))
    response.cookies.set(AUTH_COOKIE_NAME, data.token, authCookieOptions())
    response.cookies.delete(GOOGLE_STATE_COOKIE)
    return response
  } catch (error) {
    if (!(error instanceof ApiRequestError)) console.error("Google sign-in failed", error)
    return backToLogin(request, "google-failed")
  }
}
