import { redirect } from "next/navigation"

import { AdminAppSidebar } from "@/components/admin/admin-app-sidebar"
import { AdminMobileHeader } from "@/components/admin/admin-mobile-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getAdminSession } from "@/lib/admin-session"

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()
  if (!session) {
    redirect("/admin/login")
  }

  return (
    <TooltipProvider>
      <SidebarProvider className="h-svh overflow-hidden">
        <AdminAppSidebar
          user={{ name: session.name, email: session.email }}
        />
        <SidebarInset className="min-h-0 overflow-hidden">
          <AdminMobileHeader />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
