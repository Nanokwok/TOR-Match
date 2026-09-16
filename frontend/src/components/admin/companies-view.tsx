"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatThb } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  companySizeLabels,
  companyStatusLabels,
  formatCompanySize,
  type AdminCompanyListItem,
  type AdminCompanySize,
  type AdminCompanyStats,
  type AdminCompanyStatus,
} from "@/types/admin-company"

type CompaniesViewProps = {
  stats: AdminCompanyStats | null
  companies: AdminCompanyListItem[]
  total: number
  page: number
  pageSize: number
  q: string
  status: AdminCompanyStatus | "all"
  size: AdminCompanySize | "all"
  error?: string | null
}

const statusStyles: Record<AdminCompanyStatus, string> = {
  active:
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  pending:
    "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  suspended:
    "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
}

function formatJoined(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value))
}

export function CompaniesView({
  stats,
  companies,
  total,
  page,
  pageSize,
  q,
  status,
  size,
  error,
}: CompaniesViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(q)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setSearch(q)
  }, [q])

  function replaceQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key)
      else params.set(key, value)
    }
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = search.trim()
      if (next === q) return
      replaceQuery({
        q: next || null,
        page: null,
      })
    }, 300)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the typed query changes
  }, [search])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)

  const statCards = [
    { label: "Total Companies", value: stats ? String(stats.total) : "—" },
    { label: "Active", value: stats ? String(stats.active) : "—" },
    { label: "Pending", value: stats ? String(stats.pending) : "—" },
    { label: "Suspended", value: stats ? String(stats.suspended) : "—" },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} size="sm" className="bg-card">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 xl:flex-row xl:items-center",
          isPending && "opacity-70"
        )}
      >
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or tax ID..."
            className="pl-8"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            const next = (value ?? "all") as AdminCompanyStatus | "all"
            replaceQuery({
              status: next === "all" ? null : next,
              page: null,
            })
          }}
        >
          <SelectTrigger className="w-full xl:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(companyStatusLabels) as AdminCompanyStatus[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {companyStatusLabels[key]}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <Select
          value={size}
          onValueChange={(value) => {
            const next = (value ?? "all") as AdminCompanySize | "all"
            replaceQuery({
              size: next === "all" ? null : next,
              page: null,
            })
          }}
        >
          <SelectTrigger className="w-full xl:w-40">
            <SelectValue placeholder="Company Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sizes</SelectItem>
            {(Object.keys(companySizeLabels) as AdminCompanySize[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {companySizeLabels[key]}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Company</TableHead>
              <TableHead>Tax ID</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Capital</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="px-4 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {error
                    ? "Could not load companies."
                    : "No companies match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="px-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {company.nameEnglish || company.nameThai || "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {company.nameThai && company.nameEnglish
                          ? company.nameThai
                          : company.contactEmail || "—"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {company.taxId || "—"}
                  </TableCell>
                  <TableCell>{formatCompanySize(company.size)}</TableCell>
                  <TableCell>
                    {formatThb(company.registeredCapitalBaht)}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(statusStyles[company.status])}>
                      {companyStatusLabels[company.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatJoined(company.joinedAt)}
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0"
                      nativeButton={false}
                      render={
                        <Link href={`/admin/companies/${company.id}`} />
                      }
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  if (currentPage <= 1) return
                  replaceQuery({
                    page: currentPage - 1 > 1 ? String(currentPage - 1) : null,
                  })
                }}
                className={
                  currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === currentPage}
                    onClick={(event) => {
                      event.preventDefault()
                      replaceQuery({
                        page: pageNumber > 1 ? String(pageNumber) : null,
                      })
                    }}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  if (currentPage >= totalPages) return
                  replaceQuery({ page: String(currentPage + 1) })
                }}
                className={
                  currentPage >= totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
