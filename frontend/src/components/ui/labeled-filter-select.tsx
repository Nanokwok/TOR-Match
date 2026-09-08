"use client"

import type { ReactNode } from "react"

import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type LabeledFilterSelectProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  className?: string
  triggerClassName?: string
  formatValue?: (value: string) => string
}

export function LabeledFilterSelect({
  label,
  value,
  onValueChange,
  children,
  className,
  triggerClassName,
  formatValue,
}: LabeledFilterSelectProps) {
  return (
    <div
      className={cn(
        "flex h-9 min-w-0 items-stretch overflow-hidden rounded-lg border border-input bg-background",
        className
      )}
    >
      <span className="flex shrink-0 items-center border-r border-input px-2.5 text-sm whitespace-nowrap text-muted-foreground">
        {label}
      </span>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next != null) onValueChange(next)
        }}
      >
        <SelectTrigger
          className={cn(
            "h-full min-h-0 w-auto min-w-[5.5rem] flex-1 rounded-none border-0 bg-transparent px-2.5 shadow-none focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent",
            triggerClassName
          )}
        >
          <SelectValue>
            {formatValue ? formatValue(value) : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start">{children}</SelectContent>
      </Select>
    </div>
  )
}
