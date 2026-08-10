"use client"

import { Filter, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { browseActions } from "@/lib/browse-actions"
import type { TorListQuery, TorProcurementStatus } from "@/types/tor"

export type BrowseFiltersState = {
  keyword: string
  eligibleOnly: boolean
  budgetRange: string
  status: TorProcurementStatus | "all"
  department: string
}

type TorFilterBarProps = {
  filters: BrowseFiltersState
  departments: string[]
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
  }
}

export function TorFilterBar({
  filters,
  departments,
  onChange,
  onSearch,
}: TorFilterBarProps) {
  return (
    <div className="border-b border-border bg-white px-4 py-3 md:px-6">
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
          <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
            <Switch
              checked={filters.eligibleOnly}
              onCheckedChange={(checked) =>
                onChange({ ...filters, eligibleOnly: checked })
              }
              className="data-checked:bg-[#0088C9]"
            />
            <span className="whitespace-nowrap text-foreground">
              Eligible Only
            </span>
          </label>

          <Select
            value={filters.budgetRange}
            onValueChange={(value) => {
              if (value != null) onChange({ ...filters, budgetRange: value })
            }}
          >
            <SelectTrigger className="h-9 min-w-[140px] bg-background">
              <SelectValue placeholder="Budget Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Budget Range</SelectItem>
              <SelectItem value="under-3m">Under 3M</SelectItem>
              <SelectItem value="3m-6m">3M – 6M</SelectItem>
              <SelectItem value="6m-10m">6M – 10M</SelectItem>
              <SelectItem value="over-10m">Over 10M</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(value) => {
              if (value != null) {
                onChange({
                  ...filters,
                  status: value as BrowseFiltersState["status"],
                })
              }
            }}
          >
            <SelectTrigger className="h-9 min-w-[160px] bg-background">
              <SelectValue placeholder="Procurement Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Procurement Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closing-soon">Closing Soon</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="awarded">Awarded</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.department}
            onValueChange={(value) => {
              if (value != null) onChange({ ...filters, department: value })
            }}
          >
            <SelectTrigger className="h-9 min-w-[150px] bg-background">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Department</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="More filters"
            onClick={() => browseActions.openMoreFilters()}
          >
            <Filter className="size-4" />
          </Button>

          <Button
            className="h-9 bg-[#0088C9] px-5 text-white hover:bg-[#007ab4]"
            onClick={onSearch}
          >
            Search
          </Button>
        </div>
      </div>
    </div>
  )
}
