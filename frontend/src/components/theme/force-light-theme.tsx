"use client"

import { useEffect, type ReactNode } from "react"

import { useTheme } from "@/components/theme/theme-provider"
import { setForceLightMode } from "@/lib/theme"

/**
 * Locks the document to light theme while mounted (auth pages).
 * Restores the user's saved preference on unmount.
 */
export function ForceLightTheme({ children }: { children: ReactNode }) {
  const { resyncTheme } = useTheme()

  useEffect(() => {
    setForceLightMode(true)

    return () => {
      setForceLightMode(false)
      resyncTheme()
    }
  }, [resyncTheme])

  return <>{children}</>
}
