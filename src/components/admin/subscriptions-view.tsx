"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import {
  subscriptionPlanLabels,
  subscriptionStatusLabels,
  type AdminSubscription,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/server/db/mock/admin-subscriptions"
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

type SubscriptionsViewProps = {
  stats: {
    mrr: string
    activePaid: string
    trial: string
    pastDue: string
  }
  subscriptions: AdminSubscription[]
}

const statusStyles: Record<SubscriptionStatus, string> = {
  active: "border-transparent bg-emerald-100 text-emerald-800",
  trialing: "border-transparent bg-sky-100 text-sky-800",
  "past-due": "border-transparent bg-amber-100 text-amber-800",
  canceled: "border-transparent bg-rose-100 text-rose-800",
}

const planStyles: Record<SubscriptionPlan, string> = {
  free: "border-border text-muted-foreground",
  pro: "border-transparent bg-primary/10 text-primary",
  enterprise: "border-transparent bg-violet-100 text-violet-800",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value))
}

export function SubscriptionsView({
  stats,
  subscriptions,
}: SubscriptionsViewProps) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [plan, setPlan] = useState("all")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState(subscriptions)
  const [message, setMessage] = useState<string | null>(null)
  const pageSize = 5

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((item) => {
      const matchesSearch =
        !query ||
        item.companyName.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      const matchesStatus = status === "all" || item.status === status
      const matchesPlan = plan === "all" || item.plan === plan
      return matchesSearch && matchesStatus && matchesPlan
    })
  }, [rows, search, status, plan])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const pastDueCount = rows.filter((item) => item.status === "past-due").length

  function retryPastDue() {
    setRows((current) =>
      current.map((item) =>
        item.status === "past-due" ? { ...item, status: "active" } : item
      )
    )
    setMessage(`Retried ${pastDueCount} past-due subscription(s) (frontend only).`)
  }

  const statCards = [
    { label: "MRR", value: stats.mrr },
    { label: "Active Paid", value: stats.activePaid },
    { label: "Trials", value: stats.trial },
    { label: "Past Due", value: stats.pastDue },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>

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

      {message ? (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search subscriptions..."
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
            {(
              Object.keys(subscriptionStatusLabels) as SubscriptionStatus[]
            ).map((key) => (
              <SelectItem key={key} value={key}>
                {subscriptionStatusLabels[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
            {(Object.keys(subscriptionPlanLabels) as SubscriptionPlan[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {subscriptionPlanLabels[key]}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <Button
          className="xl:ml-auto"
          disabled={pastDueCount === 0}
          onClick={retryPastDue}
        >
          Retry Past Due ({pastDueCount})
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Subscription</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="px-4">Renews</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No subscriptions match your filters.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4 font-mono text-xs">
                    {item.id}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate font-medium">
                    {item.companyName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(planStyles[item.plan])}
                    >
                      {subscriptionPlanLabels[item.plan]}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.seats}</TableCell>
                  <TableCell>
                    {item.amountBaht > 0
                      ? `${formatThb(item.amountBaht)}/${item.billingCycle === "monthly" ? "mo" : "yr"}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(statusStyles[item.status])}>
                      {subscriptionStatusLabels[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4">
                    {formatDate(item.renewsAt)}
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
