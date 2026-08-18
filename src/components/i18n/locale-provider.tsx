"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import enMessages from "@/i18n/messages/en.json"
import thMessages from "@/i18n/messages/th.json"
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_STORAGE_KEY,
  localeToHtmlLang,
  type Locale,
} from "@/lib/i18n"

type Messages = typeof enMessages

const MESSAGES: Record<Locale, Messages> = {
  en: enMessages,
  th: thMessages,
}

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // Ignore storage access errors
  }
  return DEFAULT_LOCALE
}

function resolveMessage(messages: Messages, key: string): string | undefined {
  const parts = key.split(".")
  let current: unknown = messages

  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return typeof current === "string" ? current : undefined
}

function interpolate(
  template: string,
  params?: Record<string, string | number>
) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(params[name] ?? `{${name}}`)
  )
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [ready, setReady] = useState(false)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      // Ignore storage write errors
    }
  }, [])

  useEffect(() => {
    setLocaleState(readStoredLocale())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    document.documentElement.lang = localeToHtmlLang(locale)
    document.documentElement.dataset.locale = locale
  }, [locale, ready])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const messages = MESSAGES[locale]
      const fallback = MESSAGES.en
      const value =
        resolveMessage(messages, key) ?? resolveMessage(fallback, key) ?? key
      return interpolate(value, params)
    },
    [locale]
  )

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider")
  }
  return context
}
