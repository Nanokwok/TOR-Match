"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { updateAdminCompanyStatusAction } from "@/actions/admin-companies"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  getCertificationLabel,
  getSpecializationLabel,
} from "@/lib/company-setup"
import { formatThb } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CertificationId, SpecializationId } from "@/types/company-setup"
import {
  companyStatusLabels,
  formatCompanySize,
  type AdminCompanyDetail,
  type AdminCompanyStatus,
} from "@/types/admin-company"

type CompanyDetailViewProps = {
  company: AdminCompanyDetail
}

const statusStyles: Record<AdminCompanyStatus, string> = {
  active: "border-transparent bg-emerald-100 text-emerald-800",
  pending: "border-transparent bg-amber-100 text-amber-800",
  suspended: "border-transparent bg-rose-100 text-rose-800",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value))
}

function labelSpecialization(id: string) {
  return getSpecializationLabel(id as SpecializationId)
}

function labelCertification(id: string) {
  return getCertificationLabel(id as CertificationId)
}

export function CompanyDetailView({ company }: CompanyDetailViewProps) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const status = company.status

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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
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
            Back to Companies
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
              {company.nameEnglish || company.nameThai || "Company"}
            </h1>
            <Badge className={cn(statusStyles[status])}>
              {companyStatusLabels[status]}
            </Badge>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {company.nameThai || "—"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {status === "pending" ? (
            <Button
              disabled={isPending}
              onClick={() => applyStatus("active", "Company approved.")}
            >
              Approve
            </Button>
          ) : null}
          {status === "active" ? (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => applyStatus("suspended", "Company suspended.")}
            >
              Suspend
            </Button>
          ) : null}
          {status === "suspended" ? (
            <Button
              disabled={isPending}
              onClick={() => applyStatus("active", "Company reactivated.")}
            >
              Reactivate
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
            <CardTitle className="text-base">Company Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Tax ID" value={company.taxId || "—"} mono />
            <DetailRow
              label="Contact Email"
              value={company.contactEmail || "—"}
            />
            <DetailRow label="Phone" value={company.phone || "—"} />
            <Separator />
            <DetailRow
              label="Company Size"
              value={formatCompanySize(company.size)}
            />
            <DetailRow
              label="Registered Capital"
              value={formatThb(company.registeredCapitalBaht)}
            />
            <DetailRow
              label="e-GP Registered"
              value={company.egpRegistered ? "Yes" : "No"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow
              label="Team Members"
              value={String(company.memberCount)}
            />
            <DetailRow label="Joined" value={formatDate(company.joinedAt)} />
            <Separator />
            <div className="space-y-2">
              <p className="text-muted-foreground">Specializations</p>
              <div className="flex flex-wrap gap-1.5">
                {company.specializations.length > 0 ? (
                  company.specializations.map((item) => (
                    <Badge key={item} variant="secondary">
                      {labelSpecialization(item)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Certifications</p>
              <div className="flex flex-wrap gap-1.5">
                {company.certifications.length > 0 ? (
                  company.certifications.map((item) => (
                    <Badge key={item} variant="outline">
                      {labelCertification(item)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
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
