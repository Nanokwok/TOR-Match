import { required } from "@/lib/env"

const API_URL = required("NEXT_PUBLIC_API_URL")

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

function isErrorPayload(value: unknown): value is { error: string; details?: unknown } {
  return typeof value === "object" && value !== null && typeof (value as { error?: unknown }).error === "string"
}

/**
 * Thin JSON fetch wrapper around the Express backend (see backend/src/app.ts,
 * mounted under NEXT_PUBLIC_API_URL). Meant to be called from the server
 * (Server Actions / Server Components) — it talks directly to the backend
 * rather than through the browser, so no cookies are forwarded automatically.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  })

  const payload: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const message = isErrorPayload(payload) ? payload.error : `Request failed with status ${res.status}`
    throw new ApiRequestError(res.status, message, isErrorPayload(payload) ? payload.details : undefined)
  }

  return payload as T
}
