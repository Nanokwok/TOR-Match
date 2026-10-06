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

/**
 * Signs an admin in against the real backend.
 *
 * This used to be a plaintext comparison against ADMIN_EMAIL/ADMIN_PASSWORD
 * with `admin123` as the default. It now goes through POST /auth/login like
 * any other user and additionally requires `role: "admin"`, so the session can
 * carry a JWT the Express API will actually accept. Create the account with
 * `npm run seed:admin` in the backend workspace.
 */
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
      // Deliberately the same message as bad credentials: a non-admin probing
      // this form shouldn't learn that the account exists and is valid.
      return { ok: false, error: "Invalid email or password." }
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
      return { ok: false, error: error.status === 401 ? "Invalid email or password." : error.message }
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
