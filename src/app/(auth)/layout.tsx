import type { ReactNode } from "react"

import { ForceLightTheme } from "@/components/theme/force-light-theme"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <ForceLightTheme>
      <main className="flex min-h-full flex-1 flex-col bg-white text-neutral-950">
        {children}
      </main>
    </ForceLightTheme>
  )
}
