export type Locale = "en" | "th"

export const LOCALES: Locale[] = ["en", "th"]

export const LOCALE_STORAGE_KEY = "tor-match-locale"

export const DEFAULT_LOCALE: Locale = "th"

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "th"
}

export function localeToHtmlLang(locale: Locale) {
  return locale === "th" ? "th" : "en"
}

export function localeToIntl(locale: Locale) {
  return locale === "th" ? "th-TH" : "en-US"
}
