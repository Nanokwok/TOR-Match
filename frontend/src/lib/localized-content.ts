import type { Locale } from "@/lib/i18n"
import type { LocalizedList, LocalizedText } from "@/types/localized"

/**
 * Reads the requested locale from localized content, falling back to the
 * other one. A TOR can be published in Thai only (Thai is the site default),
 * so English readers see Thai rather than a blank.
 */
export function pickLocalized(value: LocalizedText, locale: Locale): string {
  return value[locale] || value.en || value.th || ""
}

/**
 * Case-insensitive substring match across *every* locale, so a Thai search term
 * still finds a TOR the user is currently reading in English (and vice versa).
 */
export function localizedIncludes(
  value: LocalizedText,
  lowercaseNeedle: string
): boolean {
  return Object.values(value).some((text) =>
    text.toLowerCase().includes(lowercaseNeedle)
  )
}

/**
 * The canonical key for filtering and cross-referencing a localized value:
 * English when present, otherwise Thai. Mirrors localizedKey() in
 * backend/src/models/localized.schema.ts — the two must agree, since the
 * browse department filter sends this key to the API.
 */
export function localizedKey(value: LocalizedText): string {
  return value.en?.trim() || value.th?.trim() || ""
}

/** List counterpart of {@link pickLocalized}. */
export function pickLocalizedList(
  value: LocalizedList,
  locale: Locale
): string[] {
  const localized = value[locale]
  if (localized?.length) return localized
  return value.en?.length ? value.en : (value.th ?? [])
}