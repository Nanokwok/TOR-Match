"use client"

import { useState } from "react"
import { Search } from "lucide-react"

import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LabeledFilterSelect } from "@/components/ui/labeled-filter-select"
import { SelectItem } from "@/components/ui/select"
import { workspaceActions } from "@/lib/workspace-actions"
import { cn } from "@/lib/utils"
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
  onAddTorById?: (torId: string) => Promise<{ ok: boolean; error?: string }>
}

export function WorkspaceFilterBar({
  filters,
  members,
  onChange,
  onSearch,
  onAddTorById,
}: WorkspaceFilterBarProps) {
  const { t } = useLocale()
  const [isAdding, setIsAdding] = useState(false)
  const [addFeedback, setAddFeedback] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  async function handleAddTor() {
    const torId = filters.torIdInput.trim()
    if (!torId || isAdding) return
    setIsAdding(true)
    setAddFeedback(null)
    try {
      if (onAddTorById) {
        const res = await onAddTorById(torId)
        if (res.ok) {
          onChange({ ...filters, torIdInput: "" })
          setAddFeedback({
            type: "success",
            text: t("common.success") || "เพิ่มสำเร็จ",
          })
          setTimeout(() => setAddFeedback(null), 3000)
        } else {
          setAddFeedback({
            type: "error",
            text: res.error || "ไม่พบ TOR นี้",
          })
          setTimeout(() => setAddFeedback(null), 4000)
        }
      } else {
        workspaceActions.addTorById(torId)
      }
    } finally {
      setIsAdding(false)
    }
  }

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
            placeholder={t("workspace.searchPlaceholder")}
            className="h-9 bg-background pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LabeledFilterSelect
            label={t("workspace.assignee")}
            value={filters.assigneeId}
            formatValue={(value) =>
              value === "all"
                ? t("common.all")
                : (members.find((m) => m.id === value)?.name ?? value)
            }
            onValueChange={(value) =>
              onChange({ ...filters, assigneeId: value })
            }
            triggerClassName="min-w-[7rem]"
          >
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </LabeledFilterSelect>

          <LabeledFilterSelect
            label={t("workspace.priority")}
            value={filters.priority}
            formatValue={(value) => {
              if (value === "all") return t("common.all")
              if (value === "HIGH") return t("common.high")
              if (value === "MEDIUM") return t("common.medium")
              if (value === "LOW") return t("common.low")
              return value
            }}
            onValueChange={(value) =>
              onChange({
                ...filters,
                priority: value as WorkspaceFiltersState["priority"],
              })
            }
          >
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="HIGH">{t("common.high")}</SelectItem>
            <SelectItem value="MEDIUM">{t("common.medium")}</SelectItem>
            <SelectItem value="LOW">{t("common.low")}</SelectItem>
          </LabeledFilterSelect>

          <div className="relative flex items-center gap-2">
            <Input
              value={filters.torIdInput}
              onChange={(event) =>
                onChange({ ...filters, torIdInput: event.target.value })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleAddTor()
                }
              }}
              placeholder={t("workspace.addTorPlaceholder")}
              className="h-9 w-[160px] bg-background"
            />
            <Button
              variant="outline"
              className="h-9 shrink-0 gap-1"
              disabled={isAdding || !filters.torIdInput.trim()}
              onClick={() => void handleAddTor()}
            >
              {isAdding ? (
                <span className="animate-pulse">{t("common.loading") || "กำลังเพิ่ม..."}</span>
              ) : (
                t("workspace.addNewTor")
              )}
            </Button>
            {addFeedback ? (
              <span
                className={cn(
                  "absolute -bottom-5 right-0 text-[11px] whitespace-nowrap animate-in fade-in-0",
                  addFeedback.type === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                )}
              >
                {addFeedback.text}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
