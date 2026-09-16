import { cookies } from "next/headers"

import { required } from "@/lib/env"

const API_URL = required("NEXT_PUBLIC_API_URL")
const AUTH_COOKIE_NAME = required("AUTH_COOKIE_NAME")

/** Error thrown by {@link apiFetch} for any non-2xx response from the backend. */
export class ApiRequestError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
    this.details = details
  }
}

function isErrorPayload(
  value: unknown
): value is { error: string; details?: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { error?: unknown }).error === "string"
  )
}

/** JWT from the Next auth cookie set by login/register server actions. */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null
}

export type ApiFetchInit = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit
  /**
   * When false, skip attaching Authorization even if a session cookie exists.
   * Use for public endpoints like login/register. Default true.
   */
  auth?: boolean
}

/**
 * Thin JSON fetch wrapper around the Express backend (see backend/src/app.ts,
 * mounted under NEXT_PUBLIC_API_URL). Meant to be called from the server
 * (Server Actions / Server Components). Attaches the Next-held JWT as
 * `Authorization: Bearer` when present so backend `requireAuth` routes work.
 */
export async function apiFetch<T>(
  path: string,
  init?: ApiFetchInit
): Promise<T> {
  const { auth = true, headers: initHeaders, ...rest } = init ?? {}
  const headers = new Headers(initHeaders)

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  if (auth && !headers.has("Authorization")) {
    const token = await getAuthToken()
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    cache: "no-store",
  })

  const payload: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const message = isErrorPayload(payload)
      ? payload.error
      : `Request failed with status ${res.status}`
    throw new ApiRequestError(
      res.status,
      message,
      isErrorPayload(payload) ? payload.details : undefined
    )
  }

  return payload as T
}
