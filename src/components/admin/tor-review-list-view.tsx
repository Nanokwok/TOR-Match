"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Info, Search } from "lucide-react"

import {
  AUTO_APPROVE_CONFIDENCE_THRESHOLD,
  confidenceLevel,
  torReviewDepartments,
  type TorReviewListItem,
  type TorReviewStatus,
} from "@/server/db/mock/admin-tor-review"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatThb } from "@/lib/format"
import { cn } from "@/lib/utils"

type TorReviewListViewProps = {
  items: TorReviewListItem[]
}

const statusStyles: Record<TorReviewStatus, string> = {
  "need-review":
    "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  "auto-approved":
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  approved:
    "border-transparent bg-emerald-600 text-white dark:bg-emerald-500",
}

const statusLabels: Record<TorReviewStatus, string> = {
  "need-review": "Need Review",
  "auto-approved": "Auto approved",
  approved: "Approved",
}

export function TorReviewListView({ items }: TorReviewListViewProps) {
  const [search, setSearch] = useState("")
  const [reviewStatus, setReviewStatus] = useState("all")
  const [department, setDepartment] = useState("all")
  const [confidence, setConfidence] = useState("all")
  const [page, setPage] = useState(1)
  const pageSize = 5

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.announcementId.toLowerCase().includes(query) ||
        item.projectTitle.toLowerCase().includes(query) ||
        item.department.toLowerCase().includes(query)
      const matchesStatus =
        reviewStatus === "all" || item.reviewStatus === reviewStatus
      const matchesDepartment =
        department === "all" || item.department === department
      const matchesConfidence =
        confidence === "all" || confidenceLevel(item.aiConfidence) === confidence
      return (
        matchesSearch && matchesStatus && matchesDepartment && matchesConfidence
      )
    })
  }, [items, search, reviewStatus, department, confidence])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">TOR Review</h1>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search tracked TORs..."
            className="pl-8"
          />
        </div>

        <Select
          value={reviewStatus}
          onValueChange={(value) => {
            setReviewStatus(value ?? "all")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full xl:w-44">
            <SelectValue placeholder="Review Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(statusLabels) as TorReviewStatus[]).map((key) => (
              <SelectItem key={key} value={key}>
                {statusLabels[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={department}
          onValueChange={(value) => {
            setDepartment(value ?? "all")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full xl:w-52">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {torReviewDepartments.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={confidence}
          onValueChange={(value) => {
            setConfidence(value ?? "all")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full xl:w-48">
            <SelectValue placeholder="AI Confidence Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All confidence</SelectItem>
            <SelectItem value="high">High (≥90%)</SelectItem>
            <SelectItem value="medium">Medium (70–89%)</SelectItem>
            <SelectItem value="low">Low (&lt;70%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Announcement ID</TableHead>
              <TableHead>Project Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>AI Confidence</TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1.5">
                  Review Status
                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      className="inline-flex text-muted-foreground hover:text-foreground"
                      aria-label="About auto approval"
                    >
                      <Info className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Auto approve when AI Confidence ≥{" "}
                      {AUTO_APPROVE_CONFIDENCE_THRESHOLD}%
                    </TooltipContent>
                  </Tooltip>
                </span>
              </TableHead>
              <TableHead className="px-4 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No TORs match your filters.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4 font-medium">
                    {item.announcementId}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate">
                    {item.projectTitle}
                  </TableCell>
                  <TableCell>{item.department}</TableCell>
                  <TableCell>{formatThb(item.budgetBaht)}</TableCell>
                  <TableCell>{item.aiConfidence}%</TableCell>
                  <TableCell>
                    <Badge className={cn(statusStyles[item.reviewStatus])}>
                      {statusLabels[item.reviewStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0"
                      nativeButton={false}
                      render={
                        <Link href={`/admin/tor-review/${item.id}`} />
                      }
                    >
                      Review & Edit
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
