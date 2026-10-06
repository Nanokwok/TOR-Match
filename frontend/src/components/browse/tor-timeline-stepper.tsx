"use client"

import { useMemo, useRef, useState } from "react"
import {
  Check,
  Clock3,
  FileDown,
  FileText,
  Paperclip,
} from "lucide-react"

import { useLocale } from "@/components/i18n/locale-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatShortDate } from "@/lib/format"
import { pickLocalized } from "@/lib/localized-content"
import { cn } from "@/lib/utils"
import type { Tor, TorStepDocument, TorTimeline } from "@/types/tor"

type TorTimelineStepperProps = {
  tor: Tor
  timeline?: TorTimeline
}

export function TorTimelineStepper({ tor, timeline: initialTimeline }: TorTimelineStepperProps) {
  const { locale } = useLocale()
  const isTh = locale === "th"

  const timeline = initialTimeline ?? tor.timeline
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [openStepCode, setOpenStepCode] = useState<string | null>(null)
  const [pinnedStepCode, setPinnedStepCode] = useState<string | null>(null)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const steps = useMemo(() => timeline?.steps ?? [], [timeline?.steps])
  const currentStepCode = timeline?.currentStepCode

  // Main 5 sequential steps: P0, 15, B0, D0, W0
  const mainSteps = useMemo(() => {
    return steps.filter(
      (s) => s.branchType !== "amendment" && s.branchType !== "cancellation"
    )
  }, [steps])

  // Map each main step to all its associated documents (including any branch files like D2, D1, W2, W1)
  const stepDocsMap = useMemo(() => {
    const map = new Map<string, TorStepDocument[]>()

    for (const step of mainSteps) {
      const docs: TorStepDocument[] = []

      // Direct documents on this step
      if (step.documents && step.documents.length > 0) {
        docs.push(...step.documents)
      } else if (step.document) {
        docs.push(step.document)
      }

      // Associated branch documents (e.g., D2 amendment under D0, W2 under W0)
      const branchSteps = steps.filter((s) => s.branchFrom === step.code)
      for (const branch of branchSteps) {
        if (branch.document) {
          docs.push(branch.document)
        }
      }

      map.set(step.code, docs)
    }

    return map
  }, [mainSteps, steps])

  if (!timeline) {
    return null
  }

  // Single file download handler
  const handleDownloadFile = (doc: TorStepDocument) => {
    setDownloadingId(doc.id)

    const link = document.createElement("a")
    link.href = doc.fileUrl
    link.download = doc.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setTimeout(() => {
      setDownloadingId(null)
    }, 1000)
  }

  // Clear pending close timeout
  const clearTimer = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  // Mouse enter: immediately clear timer and open
  const handleMouseEnter = (code: string) => {
    clearTimer()
    setOpenStepCode(code)
  }

  // Mouse leave: give a generous 350ms delay to smoothly bridge down to the popover
  const handleMouseLeave = (code: string) => {
    if (pinnedStepCode === code) return // Pinned by click, do not auto-close
    clearTimer()
    closeTimeoutRef.current = setTimeout(() => {
      setOpenStepCode((current) => (current === code ? null : current))
    }, 350)
  }

  // Click on step: pins open or unpins
  const handleClickStep = (code: string) => {
    clearTimer()
    if (pinnedStepCode === code) {
      setPinnedStepCode(null)
      setOpenStepCode(null)
    } else {
      setPinnedStepCode(code)
      setOpenStepCode(code)
    }
  }

  return (
    <div className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 my-4 transition-all">
      {/* ── Stepper Track: Edge-to-Edge with Full Connector Line ─────── */}
      <div className="relative w-full">
        {/* Connector Line stretching full width between first node center (10px) and last node center (right: 10px) */}
        <div className="absolute top-[10px] left-[10px] right-[10px] h-[2px] bg-slate-200/80 dark:bg-slate-700/80 -z-0">
          {(() => {
            const activeIndex = mainSteps.findIndex((s) => s.code === currentStepCode)
            const validIndex = activeIndex >= 0 ? activeIndex : 0
            const progressPercent = (validIndex / (mainSteps.length - 1)) * 100

            return (
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            )
          })()}
        </div>

        {/* 5 Step Nodes: First flush left, Last flush right, Middle centered */}
        <div className="w-full flex justify-between items-start relative z-10">
          {mainSteps.map((step, idx) => {
            const isFirst = idx === 0
            const isLast = idx === mainSteps.length - 1
            const isCurrent = step.code === currentStepCode
            const isCompleted = step.status === "completed"
            const isUpcoming = step.status === "upcoming"
            const docs = stepDocsMap.get(step.code) ?? []
            const hasDocs = docs.length > 0
            const isOpen = openStepCode === step.code || pinnedStepCode === step.code

            // Node visual content
            const stepNodeContent = (
              <div
                className={cn(
                  "group flex flex-col select-none transition-all rounded-md p-0.5",
                  isFirst
                    ? "items-start text-left"
                    : isLast
                    ? "items-end text-right"
                    : "items-center text-center",
                  hasDocs
                    ? "cursor-pointer hover:opacity-90"
                    : "cursor-default opacity-85"
                )}
              >
                {/* Node Circle: Solid Blue with White Icon for Completed Steps */}
                <div
                  className={cn(
                    "size-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-150 shrink-0",
                    isFirst
                      ? "self-start"
                      : isLast
                      ? "self-end"
                      : "self-center",
                    isCompleted
                      ? "bg-primary text-primary-foreground border border-primary shadow-xs"
                      : isCurrent
                      ? "bg-primary text-primary-foreground shadow-xs ring-4 ring-primary/20 scale-105"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700"
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3 stroke-[2.5] text-primary-foreground" />
                  ) : isCurrent ? (
                    <span className="size-1.5 rounded-full bg-primary-foreground" />
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* Step Title + Attachment visual cue */}
                <div
                  className={cn(
                    "flex items-center gap-1 mt-1.5 max-w-full",
                    isFirst
                      ? "justify-start text-left"
                      : isLast
                      ? "justify-end text-right"
                      : "justify-center text-center"
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] truncate tracking-tight transition-colors leading-none",
                      isCurrent
                        ? "font-semibold text-primary"
                        : isCompleted
                        ? "font-medium text-foreground"
                        : "font-normal text-muted-foreground/70"
                    )}
                  >
                    {pickLocalized(step.title, locale)}
                  </span>

                  {/* Attachment Icon Cue (13-14px) */}
                  {hasDocs ? (
                    <span
                      title={
                        isTh
                          ? `มีเอกสารแนบ ${docs.length} ฉบับ (คลิกหรือเลื่อนเมาส์เพื่อดู)`
                          : `${docs.length} attached document(s)`
                      }
                      className={cn(
                        "inline-flex items-center text-muted-foreground transition-colors shrink-0",
                        isCurrent ? "text-primary" : "group-hover:text-primary"
                      )}
                    >
                      <Paperclip className="size-3 stroke-[2]" />
                    </span>
                  ) : null}
                </div>

                {/* Subtext: First is text-left, Middle text-center, Last text-right */}
                <div
                  className={cn(
                    "h-3 flex items-center mt-0.5",
                    isFirst
                      ? "justify-start text-left"
                      : isLast
                      ? "justify-end text-right"
                      : "justify-center text-center"
                  )}
                >
                  {isCurrent ? (
                    <div className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 leading-none">
                      <Clock3 className="size-2.5 shrink-0" />
                      <span>
                        {step.daysRemaining !== null && step.daysRemaining !== undefined
                          ? isTh
                            ? `เหลือ ${step.daysRemaining} วัน`
                            : `${step.daysRemaining}d left`
                          : isTh
                          ? "ปัจจุบัน"
                          : "Active"}
                      </span>
                    </div>
                  ) : isCompleted && step.date ? (
                    <span className="text-[10px] text-muted-foreground leading-none">
                      {formatShortDate(step.date, locale)}
                    </span>
                  ) : isUpcoming ? (
                    <span className="text-[10px] text-muted-foreground/40 leading-none">
                      {isTh ? "รอดำเนินการ" : "Upcoming"}
                    </span>
                  ) : null}
                </div>
              </div>
            )

            // If this step has no documents, render static disabled node
            if (!hasDocs) {
              return (
                <div key={step.code} className="z-10">
                  {stepNodeContent}
                </div>
              )
            }

            // If this step has documents, wrap with Popover
            return (
              <Popover
                key={step.code}
                open={isOpen}
                onOpenChange={(open) => {
                  if (!open) {
                    clearTimer()
                    setOpenStepCode(null)
                    setPinnedStepCode(null)
                  }
                }}
              >
                <PopoverTrigger
                  className="focus:outline-none z-10"
                  onMouseEnter={() => handleMouseEnter(step.code)}
                  onMouseLeave={() => handleMouseLeave(step.code)}
                  onClick={() => handleClickStep(step.code)}
                >
                  {stepNodeContent}
                </PopoverTrigger>

                <PopoverContent
                  side="bottom"
                  align={isFirst ? "start" : isLast ? "end" : "center"}
                  sideOffset={4}
                  onMouseEnter={() => handleMouseEnter(step.code)}
                  onMouseLeave={() => handleMouseLeave(step.code)}
                  className="w-80 p-3 shadow-xl border border-border/80 bg-popover rounded-xl space-y-2.5 z-50 text-xs before:absolute before:-top-2.5 before:left-0 before:right-0 before:h-2.5 before:content-['']"
                >
                  {/* Popover Header */}
                  <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <FileText className="size-3.5 text-primary" />
                      <span>
                        {isTh
                          ? `เอกสารแนบ: ${pickLocalized(step.title, locale)}`
                          : `Attachments: ${pickLocalized(step.title, locale)}`}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 py-0 font-normal">
                      {docs.length} {isTh ? "ฉบับ" : "file(s)"}
                    </Badge>
                  </div>

                  {/* List of Documents */}
                  <ScrollArea className="max-h-56 pr-1">
                    <div className="space-y-2">
                    {docs.map((doc) => {
                      const isDownloading = downloadingId === doc.id
                      const docTitle = doc.name
                        ? pickLocalized(doc.name, locale)
                        : doc.fileName

                      return (
                        <div
                          key={doc.id}
                          className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground text-xs leading-snug line-clamp-2" title={docTitle}>
                              {docTitle}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                              <span className="font-mono bg-muted/80 px-1 py-0.2 rounded border border-border/40">
                                {doc.fileSize}
                              </span>
                              {doc.publishDate ? (
                                <span>{formatShortDate(doc.publishDate, locale)}</span>
                              ) : null}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadFile(doc)
                            }}
                            disabled={isDownloading}
                            className="h-7 px-2.5 text-[11px] gap-1 shrink-0 font-medium shadow-xs"
                          >
                            <FileDown
                              className={cn(
                                "size-3",
                                isDownloading ? "animate-bounce" : ""
                              )}
                            />
                            <span>{isTh ? "ดาวน์โหลด" : "Download"}</span>
                          </Button>
                        </div>
                      )
                    })}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )
          })}
        </div>
      </div>
    </div>
  )
}
