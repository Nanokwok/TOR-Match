import { redirect } from "next/navigation"

import { AdminAppSidebar } from "@/components/admin/admin-app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
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
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <span className="text-sm font-medium">TORMatch Admin</span>
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
