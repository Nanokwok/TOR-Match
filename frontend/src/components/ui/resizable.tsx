"use client"

import * as ResizablePrimitive from "react-resizable-panels"
import { ChevronsLeftRight } from "lucide-react"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  orientation = "horizontal",
  direction,
  ...props
}: ResizablePrimitive.GroupProps & {
  direction?: "horizontal" | "vertical"
}) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      orientation={direction ?? orientation}
      className={cn(
        "flex h-full w-full aria-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

function ResizablePanel({ className, ...props }: ResizablePrimitive.PanelProps) {
  return (
    <ResizablePrimitive.Panel
      data-slot="resizable-panel"
      className={cn("min-h-0 min-w-0 overflow-hidden", className)}
      {...props}
    />
  )
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "relative flex w-1.5 items-center justify-center bg-border transition-colors hover:bg-primary/20 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring cursor-col-resize aria-[orientation=horizontal]:cursor-row-resize aria-[orientation=horizontal]:h-1.5 aria-[orientation=horizontal]:w-full after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-20 flex h-7 w-4 shrink-0 items-center justify-center rounded-sm border bg-background shadow-xs hover:bg-accent hover:border-primary/50 transition-colors">
          <ChevronsLeftRight className="size-3 text-muted-foreground aria-[orientation=horizontal]:rotate-90" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
