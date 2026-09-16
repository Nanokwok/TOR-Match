import { cookies } from "next/headers"

import { ApiRequestError, apiFetch } from "@/lib/api-client"
import {
  ADMIN_API_TOKEN_COOKIE,
  getAdminSession,
  type AdminSession,
} from "@/lib/admin-session"

export class AdminApiAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AdminApiAuthError"
  }
}

/**
 * Returns the backend JWT only when an admin UI session is also present.
 * Callers must not use this token without that gate.
 */
export async function getAdminBackendToken(): Promise<string | null> {
  const session = await getAdminSession()
  if (!session) return null

  const cookieStore = await cookies()
  return cookieStore.get(ADMIN_API_TOKEN_COOKIE)?.value ?? null
}

export async function requireAdminApiAccess(): Promise<{
  session: AdminSession
  token: string
}> {
  const session = await getAdminSession()
  if (!session) {
    throw new AdminApiAuthError("Admin session required")
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_API_TOKEN_COOKIE)?.value
  if (!token) {
    throw new AdminApiAuthError("Admin API token missing — please sign in again")
  }

  return { session, token }
}

export async function adminApiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const { token } = await requireAdminApiAccess()

  try {
    return await apiFetch<T>(path, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
    })
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
      throw new AdminApiAuthError(error.message)
    }
    throw error
  }
}
