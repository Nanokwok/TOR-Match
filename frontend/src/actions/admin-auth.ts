"use server"

import { redirect } from "next/navigation"

import { ApiRequestError, apiFetch } from "@/lib/api-client"
import {
  clearAdminApiTokenCookie,
  clearAdminSessionCookie,
  setAdminApiTokenCookie,
  setAdminSessionCookie,
} from "@/lib/admin-session"

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; error: string }

type PublicUser = { id: string; email: string; name: string; role: string }
type AuthResponse = { user: PublicUser; token: string }

export async function adminLoginAction({
  email,
  password,
}: {
  email: string
  password: string
}): Promise<AdminAuthResult> {
  const trimmedEmail = email.trim().toLowerCase()
  const trimmedPassword = password.trim()

  if (!trimmedEmail || !trimmedPassword) {
    return { ok: false, error: "Email and password are required." }
  }

  try {
    const data = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
    })

    if (data.user.role !== "admin") {
      return { ok: false, error: "Not authorized for admin access." }
    }

    const now = Date.now()
    await setAdminSessionCookie({
      email: data.user.email,
      name: data.user.name,
      issuedAt: now,
      lastActiveAt: now,
    })
    await setAdminApiTokenCookie(data.token)

    return { ok: true }
  } catch (error) {
    if (error instanceof ApiRequestError) {
      if (error.status === 401) {
        return { ok: false, error: "Invalid email or password." }
      }
      return { ok: false, error: error.message }
    }
    console.error("adminLoginAction failed", error)
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}

export async function adminLogoutAction() {
  await clearAdminApiTokenCookie()
  await clearAdminSessionCookie()
  redirect("/admin/login")
}
