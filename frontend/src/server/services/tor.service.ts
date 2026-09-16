import "server-only"

import { cookies } from "next/headers"
import { ApiRequestError, apiFetch } from "@/lib/api-client"
import { required } from "@/lib/env"
import type { LocalizedText } from "@/types/localized"
import type { Tor, TorFinancials, TorListQuery, TorListResult, TorQualificationCheck } from "@/types/tor"

async function authHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get(required("AUTH_COOKIE_NAME"))?.value
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function listTors(query: TorListQuery = {}): Promise<TorListResult> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, key === "detail" ? JSON.stringify(value) : String(value))
  }
  return apiFetch<TorListResult>(`/tors?${params}`, { headers: await authHeaders() })
}

export async function getTorById(id: string): Promise<Tor | null> {
  try {
    return await apiFetch<Tor>(`/tors/${encodeURIComponent(id)}`, { headers: await authHeaders() })
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null
    throw error
  }
}

export async function listTorDepartments(): Promise<LocalizedText[]> {
  return apiFetch<LocalizedText[]>("/tors/departments")
}

export async function listTorLocalOffices(): Promise<string[]> {
  const offices = await apiFetch<LocalizedText[]>("/tors/local-offices")
  return offices.map((office) => office.en)
}

export async function getTorFinancials(torId: string): Promise<TorFinancials | null> {
  return (await getTorById(torId))?.financials ?? null
}

export async function getTorQualificationCheck(torId: string): Promise<TorQualificationCheck | null> {
  try {
    return await apiFetch<TorQualificationCheck>(`/tors/${encodeURIComponent(torId)}/qualification`, { headers: await authHeaders() })
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null
    throw error
  }
}
