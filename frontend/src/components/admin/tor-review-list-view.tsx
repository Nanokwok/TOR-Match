"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, FileSearch, Info, RotateCcw, Search, Sparkles } from "lucide-react"

import {
  AUTO_APPROVE_CONFIDENCE_THRESHOLD,
  confidenceLevel,
  type TorReviewListItem,
  type TorReviewStatus,
} from "@/types/tor-review"
import { useLocale } from "@/components/i18n/locale-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import type { Locale } from "@/lib/i18n"
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

function formatDate(iso?: string, locale?: Locale) {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Bangkok",
    }).format(d)
  } catch {
    return ""
  }
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | "ellipsis")[] = []
  pages.push(1)

  if (currentPage > 3) {
    pages.push("ellipsis")
  }

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (currentPage < totalPages - 2) {
    pages.push("ellipsis")
  }

  pages.push(totalPages)
  return pages
}

export function TorReviewListView({ items }: TorReviewListViewProps) {
  const { locale, t } = useLocale()
  const [search, setSearch] = useState("")
  const [reviewStatus, setReviewStatus] = useState("all")
  const [department, setDepartment] = useState("all")
  const [confidence, setConfidence] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // Top level stats computed across all items
  const stats = useMemo(() => {
    let needReview = 0
    let autoApproved = 0
    let approved = 0
    for (const item of items) {
      if (item.reviewStatus === "need-review") needReview++
      else if (item.reviewStatus === "auto-approved") autoApproved++
      else if (item.reviewStatus === "approved") approved++
    }
    return {
      total: items.length,
      needReview,
      autoApproved,
      approved,
    }
  }, [items])

  const statCards = [
    {
      label: locale === "th" ? "TOR ทั้งหมดที่ติดตาม" : "Total Tracked TORs",
      value: String(stats.total),
      subtext: locale === "th" ? "แบบร่างทั้งหมดในคิวตรวจสอบ" : "All drafts in review queue",
      icon: FileSearch,
    },
    {
      label: t("admin.torReviewList.status.need-review"),
      value: String(stats.needReview),
      subtext: locale === "th" ? "ต้องการคนตรวจสอบและอนุมัติ" : "Requires human review & approval",
      icon: AlertCircle,
      alert: stats.needReview > 0,
    },
    {
      label: t("admin.torReviewList.status.auto-approved"),
      value: String(stats.autoApproved),
      subtext:
        locale === "th"
          ? `ผ่านเกณฑ์ความมั่นใจ AI (≥${AUTO_APPROVE_CONFIDENCE_THRESHOLD}%)`
          : `Cleared AI threshold (≥${AUTO_APPROVE_CONFIDENCE_THRESHOLD}%)`,
      icon: Sparkles,
    },
    {
      label: t("admin.torReviewList.status.approved"),
      value: String(stats.approved),
      subtext: locale === "th" ? "เผยแพร่ไปยังรายการประกาศหลักแล้ว" : "Published to live catalog",
      icon: CheckCircle2,
    },
  ]

  // Derived from the queue rather than a fixed list
  const departments = useMemo(
    () => [...new Set(items.map((item) => item.department).filter(Boolean))].sort(),
    [items]
  )

  const isFiltered =
    search.trim() !== "" ||
    reviewStatus !== "all" ||
    department !== "all" ||
    confidence !== "all"

  function resetFilters() {
    setSearch("")
    setReviewStatus("all")
    setDepartment("all")
    setConfidence("all")
    setPage(1)
  }

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
    <ScrollArea className="h-full w-full min-h-0 flex-1" viewportClassName="min-w-0">
      <div className="flex flex-col gap-5 sm:gap-6 p-4 sm:p-6 pb-12 min-w-0">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              {t("admin.torReviewList.title")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {locale === "th"
                ? "จัดการแบบร่างจัดซื้อจัดจ้างภาครัฐและความมั่นใจจากการตรวจสอบของ AI"
                : "Manage ingested government procurement drafts and AI validation confidence"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.label} size="sm" className="bg-card">
              <CardHeader className="flex-row items-center justify-between pb-1 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                  {card.label}
                </CardTitle>
                <card.icon
                  className={cn(
                    "size-3.5 sm:size-4 shrink-0",
                    card.alert ? "text-rose-500" : "text-muted-foreground"
                  )}
                />
              </CardHeader>
              <CardContent>
                <p
                  className={cn(
                    "text-xl sm:text-2xl font-semibold tracking-tight",
                    card.alert && "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {card.value}
                </p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {card.subtext}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="relative w-full sm:w-72 lg:w-80 min-w-[200px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder={t("admin.torReviewList.searchPlaceholder")}
              className="pl-8 h-9 text-xs sm:text-sm"
            />
          </div>

          <Select
            value={reviewStatus}
            onValueChange={(value) => {
              setReviewStatus(value ?? "all")
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-38 lg:w-44 h-9 text-xs sm:text-sm">
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
            <SelectTrigger className="w-full sm:w-48 lg:w-56 h-9 text-xs sm:text-sm">
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
            <SelectTrigger className="w-full sm:w-40 lg:w-48 h-9 text-xs sm:text-sm">
              <SelectValue placeholder={t("admin.torReviewList.confidencePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.torReviewList.allConfidence")}</SelectItem>
              <SelectItem value="high">{t("admin.torReviewList.confidenceHigh")}</SelectItem>
              <SelectItem value="medium">{t("admin.torReviewList.confidenceMedium")}</SelectItem>
              <SelectItem value="low">{t("admin.torReviewList.confidenceLow")}</SelectItem>
            </SelectContent>
          </Select>

          {isFiltered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              {locale === "th" ? "ล้างตัวกรอง" : "Reset filters"}
            </Button>
          ) : null}
        </div>

        <div className="rounded-xl border bg-card overflow-hidden min-w-0 w-full shadow-xs">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[960px] w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[170px] px-4 font-semibold">
                    {t("admin.torReviewList.table.announcementId")}
                  </TableHead>
                  <TableHead className="min-w-[340px] font-semibold">
                    {t("admin.torReviewList.table.projectTitle")}
                  </TableHead>
                  <TableHead className="w-[200px] font-semibold">
                    {t("admin.torReviewList.table.department")}
                  </TableHead>
                  <TableHead className="w-[140px] font-semibold">
                    {t("admin.torReviewList.table.budget")}
                  </TableHead>
                  <TableHead className="w-[130px] font-semibold">
                    {t("admin.torReviewList.table.aiConfidence")}
                  </TableHead>
                  <TableHead className="w-[140px] font-semibold">
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
                  <TableHead className="w-[120px] px-4 text-right font-semibold">
                    {t("admin.torReviewList.table.action")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-40 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        <FileSearch className="size-8 text-muted-foreground/50 mb-1" />
                        <p className="font-medium text-foreground">
                          {t("admin.torReviewList.table.noMatch")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {locale === "th"
                            ? "ลองปรับคำค้นหาหรือตัวกรองของคุณ"
                            : "Try adjusting your search terms or filters"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="px-4 font-mono text-xs font-semibold">
                        <Link
                          href={`/admin/tor-review/${item.id}`}
                          className="text-primary hover:underline"
                        >
                          {item.announcementId}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 py-1">
                          <Link
                            href={`/admin/tor-review/${item.id}`}
                            className="font-medium text-foreground hover:underline line-clamp-2 leading-snug"
                          >
                            {item.projectTitle ||
                              (locale === "th" ? "ไม่มีชื่อโครงการ" : "Untitled Procurement")}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {item.method ? (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium uppercase text-muted-foreground">
                                {item.method}
                              </span>
                            ) : null}
                            {item.deadline ? (
                              <span>
                                {locale === "th" ? "กำหนดยื่น:" : "Deadline:"}{" "}
                                {formatDate(item.deadline, locale)}
                              </span>
                            ) : null}
                            {item.announcementDate ? (
                              <span>
                                • {locale === "th" ? "ประกาศเมื่อ:" : "Announced:"}{" "}
                                {formatDate(item.announcementDate, locale)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="line-clamp-2">{item.department || "—"}</span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground whitespace-nowrap">
                        {formatThb(item.budgetBaht, locale)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              item.aiConfidence >= AUTO_APPROVE_CONFIDENCE_THRESHOLD
                                ? "bg-emerald-500"
                                : item.aiConfidence >= 70
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            )}
                          />
                          <span className="text-sm font-semibold">
                            {item.aiConfidence}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge className={cn(statusStyles[item.reviewStatus])}>
                          {t(`admin.torReviewList.status.${item.reviewStatus}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
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
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              {locale === "th"
                ? `แสดง ${filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} จากทั้งหมด ${filtered.length} รายการ`
                : `Showing ${filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length} TOR drafts`}
            </span>
            <div className="flex items-center gap-1.5">
              <span>{locale === "th" ? "ต่อหน้า:" : "Per page:"}</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val) || 15)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {totalPages > 1 ? (
            <Pagination className="mx-0 w-full sm:w-auto justify-center sm:justify-end">
              <PaginationContent className="flex-wrap justify-center gap-1">
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
                {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === currentPage}
                        onClick={(event) => {
                          event.preventDefault()
                          setPage(p)
                        }}
                      >
                        {p}
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
          ) : null}
        </div>
      </div>
    </ScrollArea>
  )
}
