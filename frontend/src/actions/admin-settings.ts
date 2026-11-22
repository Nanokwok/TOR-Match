"use server"

import { revalidatePath } from "next/cache"

import { AdminApiAuthError, adminApiFetch } from "@/lib/admin-api"
import { ApiRequestError } from "@/lib/api-client"
import type { AdminSystemSettings } from "@/types/admin-settings"

export type AdminSystemSettingsActionResult =
  | { ok: true; settings: AdminSystemSettings }
  | { ok: false; error: string }

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof AdminApiAuthError || error instanceof ApiRequestError) {
    return error.message
  }
  console.error(fallback, error)
  return "Something went wrong. Please try again."
}

/**
 * The stored settings, or null when they could not be loaded.
 *
 * Not the defaults: a form filled with defaults looks like the real values, and
 * saving it would overwrite them (the scraper switch, the auto-approve
 * threshold, maintenance mode). Callers must show an error instead.
 */
export async function getAdminSystemSettingsAction(): Promise<AdminSystemSettings | null> {
  try {
    return await adminApiFetch<AdminSystemSettings>("/admin/settings")
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      throw error
    }
    console.error("getAdminSystemSettingsAction failed", error)
    return null
  }
}

export async function updateAdminSystemSettingsAction(
  settings: AdminSystemSettings
): Promise<AdminSystemSettingsActionResult> {
  try {
    const data = await adminApiFetch<AdminSystemSettings>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    })
    revalidatePath("/admin/settings")
    return { ok: true, settings: data }
  } catch (error) {
    return {
      ok: false,
      error: messageFromError(error, "updateAdminSystemSettingsAction failed"),
    }
  }
}

export async function resetAdminSystemSettingsAction(): Promise<AdminSystemSettingsActionResult> {
  try {
    const data = await adminApiFetch<AdminSystemSettings>("/admin/settings/reset", {
      method: "POST",
    })
    revalidatePath("/admin/settings")
    return { ok: true, settings: data }
  } catch (error) {
    return {
      ok: false,
      error: messageFromError(error, "resetAdminSystemSettingsAction failed"),
    }
  }
}
