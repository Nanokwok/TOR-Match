import type { ReactNode } from "react"

import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <Footer />
    </>
  )
}

