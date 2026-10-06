import "server-only"

import { apiFetch } from "@/lib/api-client"

/**
 * The bidder's own answers to the requirements their company profile cannot
 * cover — "ไม่เป็นบุคคลล้มละลาย", "มีผลงานประเภทเดียวกัน", and the rest that no
 * stored field can speak to.
 *
 * Saved as a set rather than row by row, so a half-saved answer sheet can never
 * be read back as the bidder's position.
 */

export type SelfCheckAnswer = {
  requirementId: string
  answer: boolean
  note?: string
}

export async function saveSelfCheck(
  torId: string,
  entries: SelfCheckAnswer[]
): Promise<void> {
  await apiFetch(`/tors/${encodeURIComponent(torId)}/self-check`, {
    method: "PUT",
    body: JSON.stringify({ entries }),
  })
}
