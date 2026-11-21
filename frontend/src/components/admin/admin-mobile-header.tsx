"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function AdminMobileHeader() {
  const { t } = useLocale()

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <span className="text-sm font-medium">{t("admin.brand")}</span>
    </header>
  )
}
