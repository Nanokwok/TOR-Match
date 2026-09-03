"use server"

import { cookies } from "next/headers"
import { ApiRequestError, apiFetch } from "@/lib/api-client"
import { required } from "@/lib/env"

const AUTH_COOKIE_NAME = required("AUTH_COOKIE_NAME")
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60 // matches backend/src/controllers/auth.controller.ts

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
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // rememberMe=false -> session cookie, cleared when the browser closes
    ...(rememberMe ? { maxAge: SESSION_MAX_AGE_SECONDS } : {}),
  })
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
    })
    await setAuthCookie(data.token, rememberMe)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: messageFromError(error, "loginWithEmailAction failed") }
  }
}

export async function loginWithGoogleAction(): Promise<AuthResult> {
  return { ok: false, error: "Google login is not available yet." }
}

export async function registerWithEmailAction({
  name,
  email,
  password,
}: EmailRegisterInput): Promise<AuthResult> {
  if (!name.trim() || !email.trim() || !password.trim()) {
    return { ok: false, error: "Name, email and password are required." }
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." }
  }

  try {
    const data = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    })
    await setAuthCookie(data.token)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: messageFromError(error, "registerWithEmailAction failed") }
  }
}

export async function registerWithGoogleAction(): Promise<AuthResult> {
  return { ok: false, error: "Google signup is not available yet." }
}
