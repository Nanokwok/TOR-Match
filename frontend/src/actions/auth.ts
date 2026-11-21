"use server"

import { randomUUID } from "node:crypto"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ApiRequestError, apiFetch } from "@/lib/api-client"
import { AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/auth-cookie"
import { GOOGLE_STATE_COOKIE, googleStateCookieOptions } from "@/lib/google-auth"
import { decodeUserToken, setUserSessionCookie, clearUserSessionCookie } from "@/lib/user-session"

export type AuthResult = { ok: true } | { ok: false; error: string }

type PublicUser = { id: string; email: string; name: string; role: string }
type AuthResponse = { user: PublicUser; token: string }

type EmailLoginInput = {
  email: string
  password: string
  rememberMe?: boolean
}

type EmailRegisterInput = {
  name: string
  email: string
  password: string
}

async function setAuthCookie(token: string, rememberMe = true) {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE_NAME, token, authCookieOptions(rememberMe))
  const session = decodeUserToken(token)
  if (session) {
    await setUserSessionCookie(session)
  }
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) return error.message
  console.error(fallback, error)
  return "Something went wrong. Please try again."
}

export async function loginWithEmailAction({
  email,
  password,
  rememberMe = true,
}: EmailLoginInput): Promise<AuthResult> {
  if (!email.trim() || !password.trim()) {
    return { ok: false, error: "Email and password are required." }
  }

  try {
    const data = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
      auth: false,
    })
    await setAuthCookie(data.token, rememberMe)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: messageFromError(error, "loginWithEmailAction failed") }
  }
}

/**
 * Starts Google sign-in by sending the browser to Google. Only comes back with
 * a result when it could not start; on success the redirect never returns, and
 * the user re-enters the app through /auth/google/callback.
 */
async function startGoogleAuth(): Promise<AuthResult> {
  let url: string
  try {
    // The state ties the callback to this browser: Google echoes it back and
    // the callback only accepts it when it matches the cookie set here.
    const state = randomUUID()
    const data = await apiFetch<{ url: string }>(
      `/auth/google/url?state=${encodeURIComponent(state)}`,
      { auth: false }
    )
    ;(await cookies()).set(GOOGLE_STATE_COOKIE, state, googleStateCookieOptions())
    url = data.url
  } catch (error) {
    return { ok: false, error: messageFromError(error, "startGoogleAuth failed") }
  }
  redirect(url)
}

export async function loginWithGoogleAction(): Promise<AuthResult> {
  return startGoogleAuth()
}

export async function registerWithEmailAction({
  name,
  email,
  password,
}: EmailRegisterInput): Promise<AuthResult> {
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return { ok: false, error: "Name, email and password are required." }
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." }
  }

  try {
    const data = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      auth: false,
    })
    await setAuthCookie(data.token)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: messageFromError(error, "registerWithEmailAction failed") }
  }
}

/** Signing up and logging in are one flow: a new Google account is created on first use. */
export async function registerWithGoogleAction(): Promise<AuthResult> {
  return startGoogleAuth()
}

export async function logoutAction(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" })
  } catch (error) {
    // Best-effort: the local cookie is cleared below regardless, so a
    // failed backend call (e.g. already-expired token) shouldn't block
    // signing the user out on this device.
    console.error("logoutAction: backend logout call failed", error)
  }

  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
  cookieStore.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 })
  await clearUserSessionCookie()
}

export type RequestPasswordResetInput = {
  email: string
}

/**
 * Asks the backend to email a reset link. The answer is the same whether or not
 * the address has an account, so a success here only means "if it does, it was sent".
 */
export async function requestPasswordResetAction({
  email,
}: RequestPasswordResetInput): Promise<AuthResult> {
  if (!email.trim()) {
    return { ok: false, error: "Email is required." }
  }
  try {
    await apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: email.trim() }),
      auth: false,
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: messageFromError(error, "requestPasswordResetAction failed") }
  }
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

/**
 * Changes the signed-in user's password. The backend ends every earlier session,
 * this one included, and answers with a fresh token that replaces the cookies.
 */
export async function changePasswordAction({
  currentPassword,
  newPassword,
}: ChangePasswordInput): Promise<AuthResult> {
  if (!currentPassword) {
    return { ok: false, error: "Current password is required." }
  }
  if (newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." }
  }
  try {
    const data = await apiFetch<{ ok: true; token: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    await setAuthCookie(data.token)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: messageFromError(error, "changePasswordAction failed") }
  }
}

export type ResetPasswordInput = {
  token?: string
  password: string
}

/** Sets a new password from the token in the emailed link. */
export async function resetPasswordAction({
  token,
  password,
}: ResetPasswordInput): Promise<AuthResult> {
  if (!token) {
    return { ok: false, error: "This password reset link is invalid or has expired. Please request a new one." }
  }
  if (!password.trim()) {
    return { ok: false, error: "Password is required." }
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." }
  }
  try {
    await apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
      auth: false,
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: messageFromError(error, "resetPasswordAction failed") }
  }
}
