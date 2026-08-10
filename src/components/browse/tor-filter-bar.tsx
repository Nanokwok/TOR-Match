"use client"

import { useMemo, useState } from "react"
import { Filter, Search, X } from "lucide-react"

import { BrowseMoreFiltersDialog } from "@/components/browse/browse-more-filters-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LabeledFilterSelect } from "@/components/ui/labeled-filter-select"
import { SelectItem } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  countActiveDetailFilters,
  EMPTY_DETAIL_FILTERS,
  getActiveDetailFilterChips,
} from "@/lib/browse-filters"
import type {
  TorDetailFilters,
  TorListQuery,
  TorProcurementStatus,
} from "@/types/tor"

export type BrowseFiltersState = {
  keyword: string
  eligibleOnly: boolean
  budgetRange: string
  status: TorProcurementStatus | "all"
  department: string
  detail: TorDetailFilters
}

type TorFilterBarProps = {
  filters: BrowseFiltersState
  departments: string[]
  localOffices: string[]
  onChange: (next: BrowseFiltersState) => void
  onSearch: () => void
}

export function filtersToQuery(filters: BrowseFiltersState): TorListQuery {
  return {
    keyword: filters.keyword,
    eligibleOnly: filters.eligibleOnly,
    budgetRange: filters.budgetRange,
    status: filters.status,
    department: filters.department,
    detail: filters.detail,
  }
}

export function TorFilterBar({
  filters,
  departments,
  localOffices,
  onChange,
  onSearch,
}: TorFilterBarProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const activeDetailCount = countActiveDetailFilters(filters.detail)
  const chips = getActiveDetailFilterChips(filters.detail)

  const baseQuery = useMemo(
    () => ({
      keyword: filters.keyword,
      eligibleOnly: filters.eligibleOnly,
      budgetRange: filters.budgetRange,
      status: filters.status,
      department: filters.department,
    }),
    [
      filters.keyword,
      filters.eligibleOnly,
      filters.budgetRange,
      filters.status,
      filters.department,
    ]
  )

  function clearChip(id: string) {
    const next = { ...filters.detail }
    switch (id) {
      case "scale":
        next.projectScales = []
        break
      case "duration":
        next.durationPresets = []
        break
      case "budget":
        next.budgetMinThb = ""
        next.budgetMaxThb = ""
        break
      case "method":
        next.procurementMethods = []
        break
      case "deadline":
        next.deadlinePreset = "any"
        next.deadlineFrom = ""
        next.deadlineTo = ""
        break
      case "fy":
        next.fiscalYear = "all"
        break
      case "office":
        next.localOffices = []
        break
      default:
        break
    }
    onChange({ ...filters, detail: next })
  }

  return (
    <div className="border-b border-border bg-card px-4 py-3 md:px-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.keyword}
              onChange={(event) =>
                onChange({ ...filters, keyword: event.target.value })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") onSearch()
              }}
              placeholder="Search your keyword..."
              className="h-9 bg-background pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
              <Switch
                checked={filters.eligibleOnly}
                onCheckedChange={(checked) =>
                  onChange({ ...filters, eligibleOnly: checked })
                }
                className="data-checked:bg-primary"
              />
              <span className="whitespace-nowrap text-foreground">
                Eligible Only
              </span>
            </label>

            <LabeledFilterSelect
              label="Budget Range"
              value={filters.budgetRange}
              onValueChange={(value) =>
                onChange({ ...filters, budgetRange: value })
              }
            >
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="under-3m">Under 3M</SelectItem>
              <SelectItem value="3m-6m">3M – 6M</SelectItem>
              <SelectItem value="6m-10m">6M – 10M</SelectItem>
              <SelectItem value="over-10m">Over 10M</SelectItem>
            </LabeledFilterSelect>

            <LabeledFilterSelect
              label="Procurement Status"
              value={filters.status}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  status: value as BrowseFiltersState["status"],
                })
              }
            >
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closing-soon">Closing Soon</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="awarded">Awarded</SelectItem>
            </LabeledFilterSelect>

            <LabeledFilterSelect
              label="Department"
              value={filters.department}
              onValueChange={(value) =>
                onChange({ ...filters, department: value })
              }
              triggerClassName="min-w-[7rem]"
            >
              <SelectItem value="all">All</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </LabeledFilterSelect>

            <Button
              variant="outline"
              className="relative h-9 gap-2 px-3"
              aria-label="More filters"
              onClick={() => setMoreOpen(true)}
            >
              <Filter className="size-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeDetailCount > 0 ? (
                <Badge className="h-5 min-w-5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground hover:bg-primary">
                  {activeDetailCount}
                </Badge>
              ) : null}
            </Button>

            <Button
              className="h-9 bg-primary px-5 text-primary-foreground hover:bg-primary/90"
              onClick={onSearch}
            >
              Search
            </Button>
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Active filters:
            </span>
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted"
                onClick={() => clearChip(chip.id)}
              >
                <span className="truncate">{chip.label}</span>
                <X className="size-3 shrink-0 text-muted-foreground" />
              </button>
            ))}
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              onClick={() =>
                onChange({
                  ...filters,
                  detail: { ...EMPTY_DETAIL_FILTERS },
                })
              }
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      <BrowseMoreFiltersDialog
        open={moreOpen}
        onOpenChange={setMoreOpen}
        baseQuery={baseQuery}
        value={filters.detail}
        localOffices={localOffices}
        onApply={(detail) => onChange({ ...filters, detail })}
      />
    </div>
  )
}
