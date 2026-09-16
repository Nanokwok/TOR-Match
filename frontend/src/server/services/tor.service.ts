import "server-only"

import { ApiRequestError, apiFetch } from "@/lib/api-client"
import { localizedKey } from "@/lib/localized-content"
import {
  getBookmarkedTorIndex,
  isTorBookmarked,
} from "@/server/services/workspace.service"
import type { LocalizedText } from "@/types/localized"
import type { Tor, TorFinancials, TorListQuery, TorListResult, TorQualificationCheck } from "@/types/tor"

/** The backend always returns `bookmarked: false`; bookmarks live on the workspace board. */
async function withBookmarkedState(items: Tor[]): Promise<Tor[]> {
  const index = await getBookmarkedTorIndex()
  return items.map((tor) => ({
    ...tor,
    bookmarked: isTorBookmarked(tor, index),
  }))
}

export async function listTors(query: TorListQuery = {}): Promise<TorListResult> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, key === "detail" ? JSON.stringify(value) : String(value))
  }
  const result = await apiFetch<TorListResult>(`/tors?${params}`)
  return { ...result, items: await withBookmarkedState(result.items) }
}

export async function getTorById(id: string): Promise<Tor | null> {
  try {
    const tor = await apiFetch<Tor>(`/tors/${encodeURIComponent(id)}`)
    const [withFlag] = await withBookmarkedState([tor])
    return withFlag
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
  return offices.map(localizedKey)
}

export async function getTorFinancials(torId: string): Promise<TorFinancials | null> {
  return (await getTorById(torId))?.financials ?? null
}

export async function getTorQualificationCheck(torId: string): Promise<TorQualificationCheck | null> {
  try {
    return await apiFetch<TorQualificationCheck>(`/tors/${encodeURIComponent(torId)}/qualification`)
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null
    throw error
  }
}
