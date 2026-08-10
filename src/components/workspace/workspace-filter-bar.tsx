"use client"

import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LabeledFilterSelect } from "@/components/ui/labeled-filter-select"
import { SelectItem } from "@/components/ui/select"
import { workspaceActions } from "@/lib/workspace-actions"
import type { TorPriority } from "@/types/tor"
import type { TeamMember } from "@/types/workspace"

export type WorkspaceFiltersState = {
  keyword: string
  assigneeId: string
  priority: TorPriority | "all"
  torIdInput: string
}

type WorkspaceFilterBarProps = {
  filters: WorkspaceFiltersState
  members: TeamMember[]
  onChange: (next: WorkspaceFiltersState) => void
  onSearch: () => void
}

export function WorkspaceFilterBar({
  filters,
  members,
  onChange,
  onSearch,
}: WorkspaceFilterBarProps) {
  return (
    <div className="border-b border-border bg-card px-4 py-3 shadow-sm md:px-6">
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
            placeholder="Search tracked TORs..."
            className="h-9 bg-background pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LabeledFilterSelect
            label="Assignee"
            value={filters.assigneeId}
            onValueChange={(value) =>
              onChange({ ...filters, assigneeId: value })
            }
            triggerClassName="min-w-[7rem]"
          >
            <SelectItem value="all">All</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </LabeledFilterSelect>

          <LabeledFilterSelect
            label="Priority"
            value={filters.priority}
            onValueChange={(value) =>
              onChange({
                ...filters,
                priority: value as WorkspaceFiltersState["priority"],
              })
            }
          >
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </LabeledFilterSelect>

          <div className="flex items-center gap-2">
            <Input
              value={filters.torIdInput}
              onChange={(event) =>
                onChange({ ...filters, torIdInput: event.target.value })
              }
              placeholder="Add TOR by ID"
              className="h-9 w-[160px] bg-background"
            />
            <Button
              variant="outline"
              className="h-9 shrink-0"
              onClick={() => {
                if (filters.torIdInput.trim()) {
                  workspaceActions.addTorById(filters.torIdInput.trim())
                }
              }}
            >
              Add New TOR
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
