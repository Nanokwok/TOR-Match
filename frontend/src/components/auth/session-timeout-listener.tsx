"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { logoutAction } from "@/actions/auth"

interface SessionTimeoutListenerProps {
  timeoutSeconds?: number
}

const DEFAULT_TIMEOUT_SECONDS = 30 * 60

export function SessionTimeoutListener({
  timeoutSeconds = DEFAULT_TIMEOUT_SECONDS,
}: SessionTimeoutListenerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const lastActiveRef = useRef<number>(0)
  const isLoggingOutRef = useRef<boolean>(false)

  useEffect(() => {
    lastActiveRef.current = Date.now()

    const handleActivity = () => {
      lastActiveRef.current = Date.now()
    }

    const checkTimeout = async () => {
      if (isLoggingOutRef.current) return

      const elapsedMs = Date.now() - lastActiveRef.current
      if (elapsedMs >= timeoutSeconds * 1000) {
        isLoggingOutRef.current = true
        try {
          await logoutAction()
        } catch {
          // Best effort cleanup
        }
        const currentPath = pathname || window.location.pathname
        const currentSearch = window.location.search
        const redirectTo = encodeURIComponent(currentPath + currentSearch)
        router.push(`/login?redirectTo=${redirectTo}`)
      }
    }

    const events = ["pointerdown", "keydown", "scroll", "touchstart"]
    for (const event of events) {
      window.addEventListener(event, handleActivity, { passive: true })
    }

    const interval = setInterval(checkTimeout, 15_000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkTimeout()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleVisibilityChange)

    return () => {
      for (const event of events) {
        window.removeEventListener(event, handleActivity)
      }
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleVisibilityChange)
    }
  }, [router, pathname, timeoutSeconds])

  return null
}
