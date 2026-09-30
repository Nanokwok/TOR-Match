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
  DEFAULT_HIGHLIGHT_DEADLINES,
  HIGHLIGHT_DEADLINES_COOKIE,
  HIGHLIGHT_DEADLINES_STORAGE_KEY,
  writePreferenceCookie,
} from "@/lib/preferences"

type DeadlineHighlightContextValue = {
  highlightDeadlines: boolean
  setHighlightDeadlines: (enabled: boolean) => void
}

const DeadlineHighlightContext = createContext<DeadlineHighlightContextValue | null>(null)

export function DeadlineHighlightProvider({
  children,
  initialHighlightDeadlines = DEFAULT_HIGHLIGHT_DEADLINES,
}: {
  children: ReactNode
  initialHighlightDeadlines?: boolean
}) {
  const [highlightDeadlines, setHighlightDeadlinesState] =
    useState<boolean>(initialHighlightDeadlines)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIGHLIGHT_DEADLINES_STORAGE_KEY)
      if (stored !== null) {
        const parsed = stored === "true"
        if (parsed !== highlightDeadlines) {
          setHighlightDeadlinesState(parsed)
          writePreferenceCookie(HIGHLIGHT_DEADLINES_COOKIE, String(parsed))
        }
      }
    } catch {
      // LocalStorage access might fail in private browsing
    }
  }, [highlightDeadlines])

  const setHighlightDeadlines = useCallback((next: boolean) => {
    setHighlightDeadlinesState(next)
    writePreferenceCookie(HIGHLIGHT_DEADLINES_COOKIE, String(next))
    try {
      localStorage.setItem(HIGHLIGHT_DEADLINES_STORAGE_KEY, String(next))
    } catch {
      // Ignore localStorage errors in restricted environments
    }
  }, [])

  return (
    <DeadlineHighlightContext.Provider
      value={{ highlightDeadlines, setHighlightDeadlines }}
    >
      {children}
    </DeadlineHighlightContext.Provider>
  )
}

export function useDeadlineHighlight(): DeadlineHighlightContextValue {
  const context = useContext(DeadlineHighlightContext)
  if (!context) {
    throw new Error(
      "useDeadlineHighlight must be used within a DeadlineHighlightProvider"
    )
  }
  return context
}
