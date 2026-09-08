"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import {
  RESOLVED_THEME_COOKIE,
  THEME_COOKIE,
  writePreferenceCookie,
} from "@/lib/preferences"
import {
  applyThemeClass,
  isForceLightMode,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme"

type ThemeContextValue = {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
  resyncTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  children,
  initialTheme,
  initialResolvedTheme,
}: {
  children: ReactNode
  /** Read from the theme cookie by the root layout, so SSR already matches. */
  initialTheme: ThemePreference
  initialResolvedTheme: ResolvedTheme
}) {
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme)
  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedTheme>(initialResolvedTheme)

  const applyResolved = useCallback((preference: ThemePreference) => {
    if (isForceLightMode()) {
      applyThemeClass("light")
      setResolvedTheme("light")
      return "light" as const
    }

    const resolved = resolveTheme(
      preference,
      window.matchMedia("(prefers-color-scheme: dark)").matches
    )
    applyThemeClass(resolved)
    setResolvedTheme(resolved)

    // The server cannot read `prefers-color-scheme`, so remember the outcome
    // for the next server render. Without this, a "system" user on a dark
    // device would get a light first paint on every fresh load.
    writePreferenceCookie(RESOLVED_THEME_COOKIE, resolved)
    return resolved
  }, [])

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next)
    writePreferenceCookie(THEME_COOKIE, next)
  }, [])

  const resyncTheme = useCallback(() => {
    applyResolved(theme)
  }, [applyResolved, theme])

  // Keeps the DOM in step with the preference and with system changes.
  // The server already applied the correct class, so this is a no-op on load
  // unless the device setting changed since the cookie was written.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    function sync() {
      applyResolved(theme)
    }

    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [theme, applyResolved])

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, resyncTheme }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}