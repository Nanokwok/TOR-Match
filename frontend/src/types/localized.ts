import type { Locale } from "@/lib/i18n"

/**
 * A single piece of content stored in every supported locale.
 *
 * Use this for *data* that genuinely differs per language (a department's
 * official name, a TOR title). UI labels belong in the i18n dictionary, not here.
 */
export type LocalizedText = Record<Locale, string>

/** List counterpart of {@link LocalizedText} — e.g. deliverables. */
export type LocalizedList = Record<Locale, string[]>

/** Builds a {@link LocalizedText}, falling back to the English value when no translation exists. */
export function localizedText(en: string, th?: string): LocalizedText {
  return { en, th: th ?? en }
}

/** Builds a {@link LocalizedList}, falling back to the English list when no translation exists. */
export function localizedList(en: string[], th?: string[]): LocalizedList {
  return { en, th: th?.length ? th : en }
}