"use server"

import { revalidatePath } from "next/cache"

import { AdminApiAuthError, adminApiFetch } from "@/lib/admin-api"
import { ApiRequestError } from "@/lib/api-client"
import {
  defaultAdminSystemSettings,
  type AdminSystemSettings,
} from "@/server/db/mock/admin-settings"

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

export async function getAdminSystemSettingsAction(): Promise<AdminSystemSettings> {
  try {
    return await adminApiFetch<AdminSystemSettings>("/admin/settings")
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      throw error
    }
    console.error("getAdminSystemSettingsAction failed, falling back to defaults", error)
    return defaultAdminSystemSettings
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
