import type { Locale } from "@/lib/i18n"

export function pickLocalized(
  en: string,
  th: string | undefined,
  locale: Locale
): string {
  return locale === "th" && th ? th : en
}

export function pickLocalizedList(
  en: string[],
  th: string[] | undefined,
  locale: Locale
): string[] {
  return locale === "th" && th?.length ? th : en
}
