"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import {
  // companyPlanLabels,
  companySizeLabels,
  companyStatusLabels,
  type AdminCompanyDetail,
  type AdminCompanyStatus,
} from "@/server/db/mock/admin-companies"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatThb } from "@/lib/format"
import { cn } from "@/lib/utils"

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(new Date(value))
}

export function CompanyDetailView({ company }: CompanyDetailViewProps) {
  const [status, setStatus] = useState(company.status)
  const [message, setMessage] = useState<string | null>(null)

  function handleApprove() {
    setStatus("active")
    setMessage("Company approved (frontend only).")
  }

  function handleSuspend() {
    setStatus("suspended")
    setMessage("Company suspended (frontend only).")
  }

  function handleReactivate() {
    setStatus("active")
    setMessage("Company reactivated (frontend only).")
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
              {company.nameEnglish}
            </h1>
            <Badge className={cn(statusStyles[status])}>
              {companyStatusLabels[status]}
            </Badge>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {company.nameThai}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {status === "pending" ? (
            <Button onClick={handleApprove}>Approve</Button>
          ) : null}
          {status === "active" ? (
            <Button variant="outline" onClick={handleSuspend}>
              Suspend
            </Button>
          ) : null}
          {status === "suspended" ? (
            <Button onClick={handleReactivate}>Reactivate</Button>
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
            <DetailRow label="Tax ID" value={company.taxId} mono />
            <DetailRow label="Contact Email" value={company.contactEmail} />
            <DetailRow label="Phone" value={company.phone} />
            <DetailRow label="Address" value={company.address} />
            <Separator />
            <DetailRow
              label="Company Size"
              value={companySizeLabels[company.size]}
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
            {/* <CardTitle className="text-base">Account & Plan</CardTitle> */}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {/* Subscription plan (Free / Pro / Enterprise) — hidden for now
            <DetailRow
              label="Subscription"
              value={companyPlanLabels[company.plan]}
            />
            */}
            <DetailRow
              label="Team Members"
              value={String(company.memberCount)}
            />
            <DetailRow label="Joined" value={formatDate(company.joinedAt)} />
            <DetailRow
              label="Last Login"
              value={formatDateTime(company.lastLoginAt)}
            />
            <Separator />
            <div className="space-y-2">
              <p className="text-muted-foreground">Specializations</p>
              <div className="flex flex-wrap gap-1.5">
                {company.specializations.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Certifications</p>
              <div className="flex flex-wrap gap-1.5">
                {company.certifications.length > 0 ? (
                  company.certifications.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
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
