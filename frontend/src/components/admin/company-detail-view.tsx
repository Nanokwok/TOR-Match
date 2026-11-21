"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { updateAdminCompanyStatusAction } from "@/actions/admin-companies"
import { useLocale } from "@/components/i18n/locale-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  getCertificationLabel,
  getSpecializationLabel,
} from "@/lib/company-setup"
import { formatThb } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Locale } from "@/lib/i18n"
import type { CertificationId, SpecializationId } from "@/types/company-setup"
import type {
  AdminCompanyDetail,
  AdminCompanyStatus,
} from "@/types/admin-company"

type CompanyDetailViewProps = {
  company: AdminCompanyDetail
}

const statusStyles: Record<AdminCompanyStatus, string> = {
  active: "border-transparent bg-emerald-100 text-emerald-800",
  pending: "border-transparent bg-amber-100 text-amber-800",
  suspended: "border-transparent bg-rose-100 text-rose-800",
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value))
}

export function CompanyDetailView({ company }: CompanyDetailViewProps) {
  const router = useRouter()
  const { locale, t } = useLocale()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const status = company.status

  function labelSpecialization(id: string) {
    const key = `companySetup.specialization.${id}`
    const translated = t(key)
    return translated !== key ? translated : getSpecializationLabel(id as SpecializationId)
  }

  function labelCertification(id: string) {
    const key = `companySetup.certification.${id}`
    const translated = t(key)
    return translated !== key ? translated : getCertificationLabel(id as CertificationId)
  }

  function applyStatus(next: AdminCompanyStatus, successMessage: string) {
    setMessage(null)
    startTransition(async () => {
      const result = await updateAdminCompanyStatusAction(company.id, next)
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      setMessage(successMessage)
      router.refresh()
    })
  }

  const primaryName =
    locale === "th"
      ? company.nameThai || company.nameEnglish || "Company"
      : company.nameEnglish || company.nameThai || "Company"
  const secondaryName =
    locale === "th"
      ? company.nameEnglish || "—"
      : company.nameThai || "—"

  return (
    <ScrollArea className="min-h-0 flex-1" viewportClassName="flex flex-col">
      <div className="flex flex-col gap-3 border-b bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 -ml-2 px-2 text-muted-foreground"
            nativeButton={false}
            render={<Link href="/admin/companies" />}
          >
            <ArrowLeft data-icon="inline-start" />
            {t("admin.companyDetail.back")}
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
              {primaryName}
            </h1>
            <Badge className={cn(statusStyles[status])}>
              {t(`admin.companiesPage.status.${status}`)}
            </Badge>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {secondaryName}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {status === "pending" ? (
            <Button
              disabled={isPending}
              onClick={() => applyStatus("active", t("admin.companyDetail.approvedNotice"))}
            >
              {t("admin.companyDetail.approve")}
            </Button>
          ) : null}
          {status === "active" ? (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => applyStatus("suspended", t("admin.companyDetail.suspendedNotice"))}
            >
              {t("admin.companyDetail.suspend")}
            </Button>
          ) : null}
          {status === "suspended" ? (
            <Button
              disabled={isPending}
              onClick={() => applyStatus("active", t("admin.companyDetail.reactivatedNotice"))}
            >
              {t("admin.companyDetail.reactivate")}
            </Button>
          ) : null}
        </div>
      </div>

      {message ? (
        <p className="border-b bg-muted/40 px-4 py-2 text-sm text-muted-foreground sm:px-6">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("admin.companyDetail.profileCard")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow
              label={t("admin.companyDetail.taxId")}
              value={company.taxId || "—"}
              mono
            />
            <DetailRow
              label={t("admin.companyDetail.contactEmail")}
              value={company.contactEmail || "—"}
            />
            <DetailRow
              label={t("admin.companyDetail.phone")}
              value={company.phone || "—"}
            />
            <Separator />
            <DetailRow
              label={t("admin.companyDetail.companySize")}
              value={
                company.size
                  ? t(`admin.companiesPage.size.${company.size}`)
                  : "—"
              }
            />
            <DetailRow
              label={t("admin.companyDetail.registeredCapital")}
              value={formatThb(company.registeredCapitalBaht, locale)}
            />
            <DetailRow
              label={t("admin.companyDetail.egpRegistered")}
              value={
                company.egpRegistered
                  ? t("admin.companyDetail.yes")
                  : t("admin.companyDetail.no")
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("admin.companyDetail.accountCard")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow
              label={t("admin.companyDetail.teamMembers")}
              value={String(company.memberCount)}
            />
            <DetailRow
              label={t("admin.companyDetail.joined")}
              value={formatDate(company.joinedAt, locale)}
            />
            <Separator />
            <div className="space-y-2">
              <p className="text-muted-foreground">
                {t("admin.companyDetail.specializations")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {company.specializations.length > 0 ? (
                  company.specializations.map((item) => (
                    <Badge key={item} variant="secondary">
                      {labelSpecialization(item)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">
                    {t("admin.companyDetail.none")}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                {t("admin.companyDetail.certifications")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {company.certifications.length > 0 ? (
                  company.certifications.map((item) => (
                    <Badge key={item} variant="outline">
                      {labelCertification(item)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">
                    {t("admin.companyDetail.none")}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("text-right font-medium", mono && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  )
}
