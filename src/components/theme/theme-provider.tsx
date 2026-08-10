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

function readStoredTheme(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemePreference(stored)) return stored
  } catch {
    // Ignore storage access errors (private mode, etc.)
  }
  return "system"
}

function getResolvedFromDom(): ResolvedTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system")
  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedTheme>("light")
  const [ready, setReady] = useState(false)

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

  const setTheme = useCallback(
    (next: ThemePreference) => {
      setThemeState(next)
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // Ignore storage write errors
      }
    },
    []
  )

  const resyncTheme = useCallback(() => {
    applyResolved(theme)
  }, [applyResolved, theme])

  useEffect(() => {
    setThemeState(readStoredTheme())
    setResolvedTheme(getResolvedFromDom())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return

    const media = window.matchMedia("(prefers-color-scheme: dark)")

    function sync() {
      applyResolved(theme)
    }

    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [theme, ready, applyResolved])

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
