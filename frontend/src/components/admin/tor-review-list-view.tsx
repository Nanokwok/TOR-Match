"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Info, Search } from "lucide-react"

import {
  AUTO_APPROVE_CONFIDENCE_THRESHOLD,
  confidenceLevel,
  type TorReviewListItem,
  type TorReviewStatus,
} from "@/types/tor-review"
import { useLocale } from "@/components/i18n/locale-provider"
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

const STATUS_KEYS: TorReviewStatus[] = ["need-review", "auto-approved", "approved"]

export function TorReviewListView({ items }: TorReviewListViewProps) {
  const { locale, t } = useLocale()
  const [search, setSearch] = useState("")
  const [reviewStatus, setReviewStatus] = useState("all")
  const [department, setDepartment] = useState("all")
  const [confidence, setConfidence] = useState("all")
  const [page, setPage] = useState(1)
  const pageSize = 5

  // Derived from the queue rather than a fixed list: the departments worth
  // filtering by are exactly the ones with drafts waiting.
  const departments = useMemo(
    () => [...new Set(items.map((item) => item.department).filter(Boolean))].sort(),
    [items]
  )

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
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("admin.torReviewList.title")}
      </h1>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder={t("admin.torReviewList.searchPlaceholder")}
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
            <SelectValue placeholder={t("admin.torReviewList.statusPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.torReviewList.allStatuses")}</SelectItem>
            {STATUS_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {t(`admin.torReviewList.status.${key}`)}
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
            <SelectValue placeholder={t("admin.torReviewList.departmentPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.torReviewList.allDepartments")}</SelectItem>
            {departments.map((name) => (
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
            <SelectValue placeholder={t("admin.torReviewList.confidencePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.torReviewList.allConfidence")}</SelectItem>
            <SelectItem value="high">{t("admin.torReviewList.confidenceHigh")}</SelectItem>
            <SelectItem value="medium">{t("admin.torReviewList.confidenceMedium")}</SelectItem>
            <SelectItem value="low">{t("admin.torReviewList.confidenceLow")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">{t("admin.torReviewList.table.announcementId")}</TableHead>
              <TableHead>{t("admin.torReviewList.table.projectTitle")}</TableHead>
              <TableHead>{t("admin.torReviewList.table.department")}</TableHead>
              <TableHead>{t("admin.torReviewList.table.budget")}</TableHead>
              <TableHead>{t("admin.torReviewList.table.aiConfidence")}</TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1.5">
                  {t("admin.torReviewList.table.reviewStatus")}
                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      className="inline-flex text-muted-foreground hover:text-foreground"
                      aria-label={t("admin.torReviewList.table.autoApproveAria")}
                    >
                      <Info className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {t("admin.torReviewList.table.autoApproveTooltip", {
                        threshold: AUTO_APPROVE_CONFIDENCE_THRESHOLD,
                      })}
                    </TooltipContent>
                  </Tooltip>
                </span>
              </TableHead>
              <TableHead className="px-4 text-right">{t("admin.torReviewList.table.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("admin.torReviewList.table.noMatch")}
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
                  <TableCell>{formatThb(item.budgetBaht, locale)}</TableCell>
                  <TableCell>{item.aiConfidence}%</TableCell>
                  <TableCell>
                    <Badge className={cn(statusStyles[item.reviewStatus])}>
                      {t(`admin.torReviewList.status.${item.reviewStatus}`)}
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
                      {t("admin.torReviewList.table.reviewAndEdit")}
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
