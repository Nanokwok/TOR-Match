"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import { createPersistedStore } from "@/lib/persisted-store"
import {
  applyThemeClass,
  isForceLightMode,
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
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

const themeStore = createPersistedStore<ThemePreference>(
  THEME_STORAGE_KEY,
  "system",
  isThemePreference
)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot
  )
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light")

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
    return resolved
  }, [])

  const setTheme = useCallback((next: ThemePreference) => {
    themeStore.set(next)
  }, [])

  const resyncTheme = useCallback(() => {
    applyResolved(theme)
  }, [applyResolved, theme])

  // Applies the theme to the DOM and mirrors what was applied into state.
  // This runs after paint, so it never blocks hydration.
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
