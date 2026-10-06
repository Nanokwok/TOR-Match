"use server"

import { ApiRequestError, getAuthToken } from "@/lib/api-client"
import { saveSelfCheck, type SelfCheckAnswer } from "@/server/services/self-check.service"
import { getTorQualificationCheck } from "@/server/services/tor.service"
import type { TorQualificationCheck } from "@/types/tor"

export type SaveSelfCheckResult =
  | { ok: true; check: TorQualificationCheck | null }
  | { ok: false; error: string }

/**
 * Stores the bidder's answers and returns the re-evaluated check.
 *
 * The fresh check comes from the server rather than being patched in the
 * browser: the statuses, `readyToBid` and the stale flags are all decided by
 * the matcher, and a panel guessing at them would drift from what the rest of
 * the app reports.
 */
export async function saveSelfCheckAction(
  torId: string,
  entries: SelfCheckAnswer[]
): Promise<SaveSelfCheckResult> {
  const token = await getAuthToken()
  if (!token) {
    return { ok: false, error: "You must be signed in to save your answers." }
  }

  try {
    await saveSelfCheck(torId, entries)
    return { ok: true, check: await getTorQualificationCheck(torId) }
  } catch (error) {
    if (error instanceof ApiRequestError) return { ok: false, error: error.message }
    console.error("saveSelfCheckAction failed", error)
    return { ok: false, error: "Could not save your answers." }
  }
}
