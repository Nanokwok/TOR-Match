"use server"

import { revalidatePath } from "next/cache"
import {
  saveTorReview,
  type TorReviewDetail,
} from "@/server/db/mock/admin-tor-review"

export type SaveTorReviewActionResult =
  | { ok: true; review: TorReviewDetail }
  | { ok: false; error: string }

export async function saveTorReviewAction(
  id: string,
  patch: Partial<TorReviewDetail>,
  publish = false
): Promise<SaveTorReviewActionResult> {
  const updated = saveTorReview(id, patch, publish)
  if (!updated) {
    return { ok: false, error: "TOR review record not found." }
  }

  revalidatePath("/admin/tor-review")
  revalidatePath(`/admin/tor-review/${id}`)
  return { ok: true, review: updated }
}
