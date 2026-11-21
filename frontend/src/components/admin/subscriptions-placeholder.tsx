"use client"

import { useLocale } from "@/components/i18n/locale-provider"

export function SubscriptionsPlaceholder() {
  const { t } = useLocale()
  return (
    <div className="space-y-2 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("admin.subscriptionsPage.title")}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t("admin.subscriptionsPage.disabledMessage")}
      </p>
    </div>
  )
}
