"use server"

import { redirect } from "next/navigation"

import {
  clearAdminSessionCookie,
  getAdminCredentials,
  setAdminSessionCookie,
} from "@/lib/admin-session"

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; error: string }

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

  const credentials = getAdminCredentials()
  if (
    trimmedEmail !== credentials.email.toLowerCase() ||
    trimmedPassword !== credentials.password
  ) {
    return { ok: false, error: "Invalid email or password." }
  }

  const now = Date.now()
  await setAdminSessionCookie({
    email: credentials.email,
    name: credentials.name,
    issuedAt: now,
    lastActiveAt: now,
  })

  return { ok: true }
}

export async function adminLogoutAction() {
  await clearAdminSessionCookie()
  redirect("/admin/login")
}
