import type { ReactNode } from "react"

import { getNotificationsAction } from "@/actions/notifications"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"

export default async function MainLayout({ children }: { children: ReactNode }) {
  const initialNotifications = await getNotificationsAction()

  return (
    <>
      <Header initialNotifications={initialNotifications} />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <Footer />
    </>
  )
}

