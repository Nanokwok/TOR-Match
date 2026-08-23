import type { Metadata } from "next"

import { ForceLightTheme } from "@/components/theme/force-light-theme"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ForceLightTheme>{children}</ForceLightTheme>
}
