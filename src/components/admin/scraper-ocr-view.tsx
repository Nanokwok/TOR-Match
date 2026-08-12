"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import type { OcrJob, OcrJobStage, OcrJobStatus } from "@/server/db/mock/admin-scraper"
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
import { cn } from "@/lib/utils"

type ScraperOcrViewProps = {
  stats: {
    scraper: string
    ocrQueue: string
    avgTime: string
    ocrAccuracy: string
    failedJobs: number
  }
  jobs: OcrJob[]
}

const statusStyles: Record<OcrJobStatus, string> = {
  running:
    "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  success:
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  failure:
    "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
}

const statusLabels: Record<OcrJobStatus, string> = {
  running: "Running",
  success: "Success",
  failure: "Failure",
}

const stageLabels: Record<OcrJobStage, string> = {
  scrape: "Scrape",
  ocr: "OCR",
  parse: "Parse",
  index: "Index",
}

export function ScraperOcrView({ stats, jobs }: ScraperOcrViewProps) {
  const [search, setSearch] = useState("")
  const [stage, setStage] = useState<string>("all")
  const [status, setStatus] = useState<string>("all")
  const [page, setPage] = useState(1)
  const pageSize = 5

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return jobs.filter((job) => {
      const matchesSearch =
        !query ||
        job.id.includes(query) ||
        job.documentSource.toLowerCase().includes(query)
      const matchesStage = stage === "all" || job.stage === stage
      const matchesStatus = status === "all" || job.status === status
      return matchesSearch && matchesStage && matchesStatus
    })
  }, [jobs, search, stage, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const statCards = [
    { label: "Scraper", value: stats.scraper },
    { label: "OCR Queue", value: stats.ocrQueue },
    { label: "Avg Time", value: stats.avgTime },
    { label: "OCR Acc", value: stats.ocrAccuracy },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Scraper & OCR</h1>

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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search Table..."
            className="pl-8"
          />
        </div>

        <Select
          value={stage}
          onValueChange={(value) => {
            setStage(value ?? "all")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Filter Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {(Object.keys(stageLabels) as OcrJobStage[]).map((key) => (
              <SelectItem key={key} value={key}>
                {stageLabels[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value ?? "all")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(statusLabels) as OcrJobStatus[]).map((key) => (
              <SelectItem key={key} value={key}>
                {statusLabels[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button className="lg:ml-auto">
          Retry Failed Jobs ({stats.failedJobs})
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Job ID</TableHead>
              <TableHead>Document Source</TableHead>
              <TableHead>Pages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="px-4 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No jobs match your filters.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="px-4 font-medium">{job.id}</TableCell>
                  <TableCell>{job.documentSource}</TableCell>
                  <TableCell>{job.pages}</TableCell>
                  <TableCell>
                    <Badge className={cn(statusStyles[job.status])}>
                      {statusLabels[job.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    {job.status === "success" ? (
                      <Button variant="outline" size="sm">
                        View Output
                      </Button>
                    ) : null}
                    {job.status === "failure" ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          Retry
                        </Button>
                        <Button variant="outline" size="sm">
                          Log
                        </Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault()
                setPage((current) => Math.max(1, current - 1))
              }}
              aria-disabled={currentPage <= 1}
              className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
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
          {totalPages > 3 ? (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          ) : null}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault()
                setPage((current) => Math.min(totalPages, current + 1))
              }}
              aria-disabled={currentPage >= totalPages}
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
  )
}
