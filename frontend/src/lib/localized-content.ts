import type { Locale } from "@/lib/i18n"
import type { LocalizedList, LocalizedText } from "@/types/localized"

/** Reads the requested locale from localized content, falling back to English. */
export function pickLocalized(value: LocalizedText, locale: Locale): string {
  return value[locale] || value.en || ""
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
 * The canonical key for a localized value. English is the identity used for
 * filtering and cross-referencing; Thai is presentation only.
 */
export function localizedKey(value: LocalizedText): string {
  return value.en
}

/** List counterpart of {@link pickLocalized}. */
export function pickLocalizedList(
  value: LocalizedList,
  locale: Locale
): string[] {
  const localized = value[locale]
  return localized?.length ? localized : (value.en ?? [])
}