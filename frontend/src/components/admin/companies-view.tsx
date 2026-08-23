"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"

import {
  // companyPlanLabels,
  companySizeLabels,
  companyStatusLabels,
  type AdminCompanyListItem,
  // type AdminCompanyPlan,
  type AdminCompanySize,
  type AdminCompanyStatus,
} from "@/server/db/mock/admin-companies"
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

type CompaniesViewProps = {
  stats: {
    total: string
    active: string
    pending: string
    suspended: string
  }
  companies: AdminCompanyListItem[]
}

const statusStyles: Record<AdminCompanyStatus, string> = {
  active:
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  pending:
    "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  suspended:
    "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
}

// Subscription plans (Free / Pro / Enterprise) — hidden for now
// const planStyles: Record<AdminCompanyPlan, string> = {
//   free: "border-border text-muted-foreground",
//   pro: "border-transparent bg-primary/10 text-primary",
//   enterprise: "border-transparent bg-violet-100 text-violet-800",
// }

export function CompaniesView({ stats, companies }: CompaniesViewProps) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  // const [plan, setPlan] = useState("all")
  const [size, setSize] = useState("all")
  const [page, setPage] = useState(1)
  const pageSize = 5

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return companies.filter((company) => {
      const matchesSearch =
        !query ||
        company.nameEnglish.toLowerCase().includes(query) ||
        company.nameThai.toLowerCase().includes(query) ||
        company.taxId.includes(query) ||
        company.contactEmail.toLowerCase().includes(query)
      const matchesStatus = status === "all" || company.status === status
      // const matchesPlan = plan === "all" || company.plan === plan
      const matchesSize = size === "all" || company.size === size
      return matchesSearch && matchesStatus && matchesSize
      // && matchesPlan
    })
  }, [companies, search, status, size])
  // }, [companies, search, status, plan, size])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const statCards = [
    { label: "Total Companies", value: stats.total },
    { label: "Active", value: stats.active },
    { label: "Pending", value: stats.pending },
    { label: "Suspended", value: stats.suspended },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>

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

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search companies..."
            className="pl-8"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value ?? "all")
            setPage(1)
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

        {/* Plan filter (Free / Pro / Enterprise) — hidden for now
        <Select
          value={plan}
          onValueChange={(value) => {
            setPlan(value ?? "all")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full xl:w-40">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {(Object.keys(companyPlanLabels) as AdminCompanyPlan[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {companyPlanLabels[key]}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        */}

        <Select
          value={size}
          onValueChange={(value) => {
            setSize(value ?? "all")
            setPage(1)
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
              {/* <TableHead>Plan</TableHead> */}
              <TableHead>Capital</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="px-4 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No companies match your filters.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="px-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {company.nameEnglish}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {company.contactEmail}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {company.taxId}
                  </TableCell>
                  <TableCell>{companySizeLabels[company.size]}</TableCell>
                  {/* Plan badge (Free / Pro / Enterprise) — hidden for now
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(planStyles[company.plan])}
                    >
                      {companyPlanLabels[company.plan]}
                    </Badge>
                  </TableCell>
                  */}
                  <TableCell>
                    {formatThb(company.registeredCapitalBaht)}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(statusStyles[company.status])}>
                      {companyStatusLabels[company.status]}
                    </Badge>
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
                  setPage((current) => Math.max(1, current - 1))
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
                      setPage(pageNumber)
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
                  setPage((current) => Math.min(totalPages, current + 1))
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
