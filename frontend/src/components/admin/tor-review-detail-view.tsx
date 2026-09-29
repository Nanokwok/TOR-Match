"use client"

import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRightLeft,
  ClipboardList,
  FileText,
  Plus,
  Trash2,
  X,
  Zap,
} from "lucide-react"

import { saveTorReviewAction } from "@/actions/admin-tor-review"
import {
  createEmptyMilestone,
  createEmptyAutoQualification,
  createEmptyManualQualification,
  type ReviewMilestone,
  type ReviewQualification,
  type TorReviewDetail,
  type TorReviewStatus,
} from "@/server/db/mock/admin-tor-review"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatDuration } from "@/lib/format"
import {
  defaultCriteriaForType,
  criteriaLabel,
} from "@/lib/qualification-criteria"
import { validateForm, type FormErrors } from "@/lib/tor-review-validation"
import { cn } from "@/lib/utils"
import type {
  TorProcurementMethod,
  TorProcurementStatus,
  TorProjectScale,
} from "@/types/tor"
import type { QualificationCriteria } from "@/types/qualification-criteria"
import { QualificationCriteriaEditor } from "@/components/admin/qualification-criteria-editor"

type TorReviewDetailViewProps = {
  tor: TorReviewDetail
  departments: string[]
}

const statusStyles: Record<TorReviewStatus, string> = {
  "need-review":
    "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  "auto-approved":
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  approved:
    "border-transparent bg-emerald-600 text-white dark:bg-emerald-500",
}

const statusLabels: Record<TorReviewStatus, string> = {
  "need-review": "Need Review",
  "auto-approved": "Auto approved",
  approved: "Approved",
}

const PROJECT_SCALES: TorProjectScale[] = [
  "SMALL",
  "MEDIUM",
  "LARGE",
  "ENTERPRISE",
]

const METHODS: TorProcurementMethod[] = [
  "e-bidding",
  "e-market",
  "selective",
  "specific",
  "price-agreement",
]

const STATUSES: TorProcurementStatus[] = [
  "open",
  "closing-soon",
  "closed",
  "awarded",
]

function toDateTimeLocal(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toSafeIsoString(value: string, fallback: string): string {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function subscribeDesktopMedia(callback: () => void) {
  const media = window.matchMedia("(min-width: 1024px)")
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

function getDesktopSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches
}

function getDesktopServerSnapshot() {
  return true
}

export function TorReviewDetailView({
  tor,
  departments,
}: TorReviewDetailViewProps) {
  const [projectTitleTh, setProjectTitleTh] = useState(tor.projectTitleTh)
  const [projectTitleEn, setProjectTitleEn] = useState(tor.projectTitleEn)
  const [announcementId, setAnnouncementId] = useState(tor.announcementId)
  const [department, setDepartment] = useState(tor.department)
  const [localOffice, setLocalOffice] = useState(tor.localOffice)
  const [budget, setBudget] = useState(String(tor.budgetBaht))
  const [medianPrice, setMedianPrice] = useState(String(tor.medianPriceBaht))
  const [projectScale, setProjectScale] = useState(tor.projectScale)
  const [durationDays, setDurationDays] = useState(String(tor.durationDays))
  const [method, setMethod] = useState(tor.method)
  const [status, setStatus] = useState(tor.status)
  const [deadline, setDeadline] = useState(toDateTimeLocal(tor.deadline))
  const [announcementDate, setAnnouncementDate] = useState(
    toDateTimeLocal(tor.announcementDate)
  )
  const [sourceUrl, setSourceUrl] = useState(tor.sourceUrl)
  const [summary, setSummary] = useState(tor.summary)
  const [deliverables, setDeliverables] = useState(tor.deliverables)
  const [techTags, setTechTags] = useState(tor.techTags)
  const [techInput, setTechInput] = useState("")
  const [listTags, setListTags] = useState(tor.listTags ?? [])
  const [listTagInput, setListTagInput] = useState("")
  const [milestones, setMilestones] = useState(tor.milestones)
  const [qualifications, setQualifications] = useState(
    tor.qualificationRequirements
  )
  const [reviewStatus, setReviewStatus] = useState<TorReviewStatus>(
    tor.reviewStatus
  )
  const isDesktop = useSyncExternalStore(
    subscribeDesktopMedia,
    getDesktopSnapshot,
    getDesktopServerSnapshot
  )
  const [isResizing, setIsResizing] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  const budgetNumber = Number(budget) || 0

  function clearError(field: keyof FormErrors) {
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function updateDeliverable(index: number, value: string) {
    setDeliverables((current) =>
      current.map((item, i) => (i === index ? value : item))
    )
  }

  function addTechTag() {
    const next = techInput.trim()
    if (!next || techTags.includes(next)) return
    setTechTags((current) => [...current, next])
    setTechInput("")
  }

  function removeTechTag(tag: string) {
    setTechTags((current) => current.filter((item) => item !== tag))
  }

  function addListTag() {
    const next = listTagInput.trim()
    if (!next || listTags.includes(next)) return
    setListTags((current) => [...current, next])
    setListTagInput("")
  }

  function removeListTag(tag: string) {
    setListTags((current) => current.filter((item) => item !== tag))
  }

  function updateMilestone(
    index: number,
    patch: Partial<ReviewMilestone>
  ) {
    clearError("milestones")
    setMilestones((current) =>
      current.map((item, i) => {
        if (i !== index) return item
        const next = { ...item, ...patch }
        if (patch.percent != null) {
          next.amountBaht = Math.round((budgetNumber * next.percent) / 100)
        }
        return next
      })
    )
  }

  function updateQualification(
    index: number,
    patch: Partial<ReviewQualification>
  ) {
    setQualifications((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  function updateQualificationById(
    id: string,
    patch: Partial<ReviewQualification>
  ) {
    setQualifications((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  function removeQualificationById(id: string) {
    setQualifications((current) => current.filter((item) => item.id !== id))
  }

  function switchToManual(id: string) {
    setQualifications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              autoCheckable: false,
              criteria: undefined,
            }
          : item
      )
    )
  }

  function switchToAuto(id: string) {
    setQualifications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              autoCheckable: true,
              requirement: item.requirement || "Registered Capital",
              criteria: defaultCriteriaForType("registered-capital"),
            }
          : item
      )
    )
  }

  function addAutoQualification() {
    setQualifications((current) => [
      ...current,
      createEmptyAutoQualification(),
    ])
  }

  function addManualQualification() {
    setQualifications((current) => [
      ...current,
      createEmptyManualQualification(),
    ])
  }

  function getValidationErrors(): FormErrors {
    return validateForm({
      budget,
      medianPrice,
      announcementDate,
      deadline,
      durationDays,
      milestones,
    })
  }

  function buildPatch(): Partial<TorReviewDetail> {
    return {
      projectTitleTh,
      projectTitleEn,
      projectTitle: projectTitleEn,
      announcementId,
      department,
      localOffice,
      budgetBaht: budgetNumber,
      medianPriceBaht: Number(medianPrice) || 0,
      projectScale,
      durationDays: Number(durationDays) || 0,
      method,
      status,
      deadline: toSafeIsoString(deadline, tor.deadline),
      announcementDate: toSafeIsoString(announcementDate, tor.announcementDate),
      sourceUrl,
      summary,
      deliverables: deliverables.filter((item) => item.trim().length > 0),
      techTags,
      listTags,
      milestones,
      qualificationRequirements: qualifications,
    }
  }

  async function handleSaveDraft() {
    setIsSavingDraft(true)
    setMessage(null)
    const validationErrors = getValidationErrors()
    setErrors(validationErrors)

    try {
      const res = await saveTorReviewAction(tor.id, buildPatch(), false)
      if (!res.ok) {
        setMessage(res.error)
      } else {
        setReviewStatus(res.review.reviewStatus)
        setMessage(
          Object.keys(validationErrors).length > 0
            ? "Draft saved with validation warnings."
            : "Draft saved successfully."
        )
      }
    } catch {
      setMessage("Failed to save draft. Please try again.")
    } finally {
      setIsSavingDraft(false)
    }
  }

  async function handleApprove() {
    const validationErrors = getValidationErrors()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setMessage("Please correct the validation errors before publishing.")
      return
    }

    setIsPublishing(true)
    setMessage(null)
    setErrors({})

    try {
      const res = await saveTorReviewAction(tor.id, buildPatch(), true)
      if (!res.ok) {
        setMessage(res.error)
      } else {
        setReviewStatus(res.review.reviewStatus)
        setMessage("Approved & published successfully.")
      }
    } catch {
      setMessage("Failed to approve and publish. Please try again.")
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 border-b bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 -ml-2 px-2 text-muted-foreground"
            nativeButton={false}
            render={<Link href="/admin/tor-review" />}
          >
            <ArrowLeft data-icon="inline-start" />
            Back to Review List
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
              {announcementId}: {projectTitleEn}
            </h1>
            <Badge className={cn("shrink-0", statusStyles[reviewStatus])}>
              {statusLabels[reviewStatus]}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-initial"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isPublishing}
          >
            {isSavingDraft ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            className="flex-1 sm:flex-initial"
            onClick={handleApprove}
            disabled={isSavingDraft || isPublishing}
          >
            {isPublishing ? "Publishing..." : "Approve & Publish"}
          </Button>
        </div>
      </div>

      {message ? (
        <p
          className={cn(
            "shrink-0 border-b px-4 py-2 text-sm sm:px-6",
            Object.keys(errors).length > 0
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : reviewStatus === "approved" && message.includes("Approved")
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-border bg-muted/40 text-muted-foreground"
          )}
        >
          {message}
        </p>
      ) : null}

      <ResizablePanelGroup
        orientation={isDesktop ? "horizontal" : "vertical"}
        className="min-h-0 flex-1"
      >
        <ResizablePanel
          defaultSize="50%"
          minSize="20%"
          maxSize="80%"
          className="flex min-h-0 flex-col overflow-hidden bg-muted/30"
        >
          <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/40 px-3 text-xs text-muted-foreground">
            <span className="font-medium">Original TOR Document (PDF)</span>
          </div>
          <div className="relative min-h-0 flex-1 w-full">
            <iframe
              title={`TOR PDF ${announcementId}`}
              src={tor.pdfUrl}
              className="h-full w-full border-none"
            />
            {isResizing ? (
              <div className="absolute inset-0 z-50 bg-transparent" />
            ) : null}
          </div>
        </ResizablePanel>

        <ResizableHandle
          withHandle
          onPointerDown={() => {
            setIsResizing(true)
            const handlePointerUp = () => {
              setIsResizing(false)
              window.removeEventListener("pointerup", handlePointerUp)
            }
            window.addEventListener("pointerup", handlePointerUp)
          }}
        />

        <ResizablePanel
          defaultSize="50%"
          minSize="20%"
          className="min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 lg:p-6 @container"
        >
          <form
            className="@container space-y-8"
            onSubmit={(event) => {
              event.preventDefault()
              handleSaveDraft()
            }}
          >
            <section className="space-y-4">
              <h2 className="text-sm font-semibold tracking-tight">
                1. General Metadata
              </h2>
              <div className="grid gap-4 grid-cols-1 @md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="announcement-id">Announcement No.</Label>
                  <Input
                    id="announcement-id"
                    value={announcementId}
                    onChange={(event) => setAnnouncementId(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source-url">Source URL</Label>
                  <Input
                    id="source-url"
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title-th">Project Title (TH)</Label>
                <Input
                  id="title-th"
                  value={projectTitleTh}
                  onChange={(event) => setProjectTitleTh(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title-en">Project Title (EN)</Label>
                <Input
                  id="title-en"
                  value={projectTitleEn}
                  onChange={(event) => setProjectTitleEn(event.target.value)}
                />
              </div>
              <div className="grid gap-4 grid-cols-1 @md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={department}
                    onValueChange={(value) => {
                      if (value) setDepartment(value)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="local-office">Local Office</Label>
                  <Input
                    id="local-office"
                    value={localOffice}
                    onChange={(event) => setLocalOffice(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Project Scale</Label>
                  <Select
                    value={projectScale}
                    onValueChange={(value) => {
                      if (value) setProjectScale(value as TorProjectScale)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_SCALES.map((scale) => (
                        <SelectItem key={scale} value={scale}>
                          {scale}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select
                    value={method}
                    onValueChange={(value) => {
                      if (value) setMethod(value as TorProcurementMethod)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      if (value) setStatus(value as TorProcurementStatus)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 grid-cols-1 @md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="duration-days">Duration (days)</Label>
                  <Input
                    id="duration-days"
                    inputMode="numeric"
                    value={durationDays}
                    aria-invalid={Boolean(errors.durationDays)}
                    className={cn(errors.durationDays && "border-destructive")}
                    onChange={(event) => {
                      setDurationDays(event.target.value)
                      clearError("durationDays")
                    }}
                  />
                  {errors.durationDays ? (
                    <p className="text-xs text-destructive">{errors.durationDays}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration-preview">Duration Label</Label>
                  <Input
                    id="duration-preview"
                    value={
                      Number(durationDays) > 0
                        ? formatDuration(Number(durationDays))
                        : ""
                    }
                    readOnly
                    aria-describedby="duration-preview-hint"
                    className="bg-muted text-muted-foreground"
                  />
                  <p
                    id="duration-preview-hint"
                    className="text-xs text-muted-foreground"
                  >
                    Derived from the day count — rendered per locale at display time.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="announced">Announcement Date</Label>
                  <Input
                    id="announced"
                    type="datetime-local"
                    value={announcementDate}
                    aria-invalid={Boolean(errors.announcementDate)}
                    className={cn(errors.announcementDate && "border-destructive")}
                    onChange={(event) => {
                      setAnnouncementDate(event.target.value)
                      clearError("announcementDate")
                      clearError("deadline")
                    }}
                  />
                  {errors.announcementDate ? (
                    <p className="text-xs text-destructive">{errors.announcementDate}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Submission Deadline</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={deadline}
                    aria-invalid={Boolean(errors.deadline)}
                    className={cn(errors.deadline && "border-destructive")}
                    onChange={(event) => {
                      setDeadline(event.target.value)
                      clearError("deadline")
                    }}
                  />
                  {errors.deadline ? (
                    <p className="text-xs text-destructive">{errors.deadline}</p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold tracking-tight">
                2. Summary, Deliverables & Tech Tags
              </h2>
              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  className="min-h-28"
                />
              </div>
              <div className="space-y-3">
                <Label>Key Deliverables</Label>
                <ol className="space-y-2">
                  {deliverables.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-2 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {index + 1}
                      </span>
                      <Input
                        value={item}
                        onChange={(event) =>
                          updateDeliverable(index, event.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setDeliverables((current) =>
                            current.filter((_, i) => i !== index)
                          )
                        }
                        aria-label="Remove deliverable"
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ol>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDeliverables((current) => [...current, ""])
                  }
                >
                  <Plus data-icon="inline-start" />
                  Add deliverable
                </Button>
              </div>
              <div className="grid gap-4 grid-cols-1 @md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tech-stack">Tech Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tech-stack"
                      value={techInput}
                      onChange={(event) => setTechInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          addTechTag()
                        }
                      }}
                      placeholder="Add tech tag and press Enter"
                    />
                    <Button type="button" variant="outline" onClick={addTechTag}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {techTags.map((tag) => (
                      <Badge
                        key={tag}
                        className="gap-1 bg-primary/10 text-primary hover:bg-primary/15"
                      >
                        {tag}
                        <button
                          type="button"
                          className="rounded-sm opacity-70 hover:opacity-100"
                          onClick={() => removeTechTag(tag)}
                          aria-label={`Remove ${tag}`}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="list-tags">List / Category Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      id="list-tags"
                      value={listTagInput}
                      onChange={(event) => setListTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          addListTag()
                        }
                      }}
                      placeholder="Add category tag and press Enter"
                    />
                    <Button type="button" variant="outline" onClick={addListTag}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {listTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          className="rounded-sm opacity-70 hover:opacity-100"
                          onClick={() => removeListTag(tag)}
                          aria-label={`Remove ${tag}`}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold tracking-tight">
                      3. Qualification Requirements
                    </h2>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {qualifications.length} total
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto-check criteria evaluate vendor profiles automatically. Manual criteria require vendor self-declaration.
                  </p>
                </div>
              </div>

              {/* ── 3.1 Auto-Check Qualifications ───────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Zap className="size-3.5" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Auto-Check Criteria ({qualifications.filter((q) => q.autoCheckable).length})
                    </h3>
                    <span className="text-[11px] text-muted-foreground hidden @md:inline">
                      — verified automatically against vendor company profile
                    </span>
                  </div>
                </div>

                {qualifications.filter((q) => q.autoCheckable).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-primary/25 bg-primary/[0.01] p-6 text-center text-xs text-muted-foreground space-y-2">
                    <p>No auto-check criteria configured.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAutoQualification}
                      className="gap-1 text-xs text-primary border-primary/30"
                    >
                      <Plus className="size-3.5" />
                      Add First Auto Criteria
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {qualifications
                      .filter((q) => q.autoCheckable)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all space-y-3.5"
                        >
                          {/* Card header */}
                          <div className="flex items-center justify-between gap-2 border-b pb-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 truncate max-w-[150px] @sm:max-w-xs">
                                {item.requirement || "Auto-check field"}
                              </Badge>
                              {item.criteria && (
                                <span className="text-xs text-muted-foreground hidden @md:inline truncate">
                                  Rule: <strong className="text-foreground font-semibold">{criteriaLabel(item.criteria)}</strong>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => switchToManual(item.id)}
                                title="Move this requirement to Manual section"
                              >
                                <ArrowRightLeft className="size-3" />
                                <span className="hidden @sm:inline">Move to</span> Manual
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeQualificationById(item.id)}
                                aria-label="Remove qualification"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* TOR clause description */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <FileText className="size-3.5 text-muted-foreground/70" />
                                Original TOR Clause
                              </Label>
                              <span className="text-[10px] text-muted-foreground">
                                Extracted text from document
                              </span>
                            </div>
                            <Input
                              className="h-8 text-xs font-normal"
                              placeholder="Exact requirement text as extracted from the TOR document…"
                              value={item.torCriteria}
                              onChange={(e) =>
                                updateQualificationById(item.id, {
                                  torCriteria: e.target.value,
                                })
                              }
                            />
                          </div>

                          {/* Machine-checkable condition editor with budget presets */}
                          <div className="space-y-1.5 pt-0.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                              Matching Rule &amp; Condition
                            </Label>
                            <QualificationCriteriaEditor
                              criteria={item.criteria ?? defaultCriteriaForType("registered-capital")}
                              budgetBaht={budgetNumber}
                              onTypeChange={(_newType, label) => {
                                updateQualificationById(item.id, { requirement: label })
                              }}
                              onChange={(nextCriteria) =>
                                updateQualificationById(item.id, { criteria: nextCriteria })
                              }
                            />
                          </div>
                        </div>
                      ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAutoQualification}
                      className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5 w-full sm:w-auto"
                    >
                      <Plus className="size-3.5" />
                      Add Auto Criteria
                    </Button>
                  </div>
                )}
              </div>

              {/* ── 3.2 Manual Qualifications ────────────────────────── */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <ClipboardList className="size-3.5" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Manual Requirements ({qualifications.filter((q) => !q.autoCheckable).length})
                    </h3>
                    <span className="text-[11px] text-muted-foreground hidden @md:inline">
                      — qualitative clauses verified via vendor self-declaration
                    </span>
                  </div>
                </div>

                {qualifications.filter((q) => !q.autoCheckable).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center text-xs text-muted-foreground space-y-2">
                    <p>No manual requirements configured.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addManualQualification}
                      className="gap-1 text-xs"
                    >
                      <Plus className="size-3.5" />
                      Add First Manual Requirement
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {qualifications
                      .filter((q) => !q.autoCheckable)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-dashed border-border bg-card/60 p-4 shadow-2xs hover:border-muted-foreground/50 transition-all space-y-3"
                        >
                          {/* Card header */}
                          <div className="flex items-center justify-between gap-2 border-b pb-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="outline" className="text-[10px] text-muted-foreground font-medium shrink-0">
                                Manual Self-Declaration
                              </Badge>
                              <span className="text-[11px] text-muted-foreground hidden @md:inline truncate">
                                Vendor checks &ldquo;We comply&rdquo; on match page
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-xs text-primary hover:text-primary/80"
                                onClick={() => switchToAuto(item.id)}
                                title="Convert this requirement to an automated rule"
                              >
                                <ArrowRightLeft className="size-3" />
                                <span className="hidden @sm:inline">Convert to</span> Auto Check
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeQualificationById(item.id)}
                                aria-label="Remove qualification"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Inputs: Requirement name & TOR criteria */}
                          <div className="grid gap-3 grid-cols-1 @md:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Requirement Title</Label>
                              <Input
                                className="h-8 text-xs font-normal"
                                placeholder="e.g. Government System Experience, Office in Bangkok…"
                                value={item.requirement}
                                onChange={(e) =>
                                  updateQualificationById(item.id, {
                                    requirement: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Original TOR Clause (Verification details)</Label>
                              <Input
                                className="h-8 text-xs font-normal"
                                placeholder="e.g. Must have delivered 2+ government projects in past 3 years…"
                                value={item.torCriteria}
                                onChange={(e) =>
                                  updateQualificationById(item.id, {
                                    torCriteria: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addManualQualification}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full sm:w-auto"
                    >
                      <Plus className="size-3.5" />
                      Add Manual Requirement
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold tracking-tight">
                4. Financials & Payment Timeline
              </h2>
              <div className="grid gap-4 grid-cols-1 @md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="budget">Total Budget (THB)</Label>
                  <Input
                    id="budget"
                    inputMode="numeric"
                    value={budget}
                    aria-invalid={Boolean(errors.budget)}
                    className={cn(errors.budget && "border-destructive")}
                    onChange={(event) => {
                      const next = event.target.value
                      setBudget(next)
                      clearError("budget")
                      const nextBudget = Number(next) || 0
                      setMilestones((current) =>
                        current.map((item) => ({
                          ...item,
                          amountBaht: Math.round(
                            (nextBudget * item.percent) / 100
                          ),
                        }))
                      )
                    }}
                  />
                  {errors.budget ? (
                    <p className="text-xs text-destructive">{errors.budget}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="median-price">Median Price (THB)</Label>
                  <Input
                    id="median-price"
                    inputMode="numeric"
                    value={medianPrice}
                    aria-invalid={Boolean(errors.medianPrice)}
                    className={cn(errors.medianPrice && "border-destructive")}
                    onChange={(event) => {
                      setMedianPrice(event.target.value)
                      clearError("medianPrice")
                    }}
                  />
                  {errors.medianPrice ? (
                    <p className="text-xs text-destructive">{errors.medianPrice}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label>Payment Milestones (Timeline)</Label>
                    {errors.milestones ? (
                      <p className="text-xs text-destructive">{errors.milestones}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      clearError("milestones")
                      setMilestones((current) => [
                        ...current,
                        createEmptyMilestone(
                          current.length + 1,
                          budgetNumber
                        ),
                      ])
                    }}
                  >
                    <Plus data-icon="inline-start" />
                    Add milestone
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <div className="min-w-[500px]">
                    <div className="grid grid-cols-[72px_1fr_88px_1fr_36px] gap-2 bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
                      <span>Day</span>
                      <span>Milestone</span>
                      <span>%</span>
                      <span>Deliverable</span>
                      <span />
                    </div>
                    <div className="divide-y">
                      {milestones.length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                          No milestones yet.
                        </p>
                      ) : (
                        milestones.map((item, index) => (
                          <div
                            key={`${item.milestoneNumber}-${index}`}
                            className="grid grid-cols-[72px_1fr_88px_1fr_36px] items-start gap-2 px-3 py-2"
                          >
                            <Input
                              inputMode="numeric"
                              value={item.day}
                              onChange={(event) =>
                                updateMilestone(index, {
                                  day: Number(event.target.value) || 0,
                                })
                              }
                              aria-label={`Milestone ${index + 1} day`}
                            />
                            <div className="space-y-1">
                              <Input
                                inputMode="numeric"
                                value={item.milestoneNumber}
                                onChange={(event) =>
                                  updateMilestone(index, {
                                    milestoneNumber:
                                      Number(event.target.value) || 0,
                                  })
                                }
                                aria-label={`Milestone ${index + 1} number`}
                              />
                              <p className="text-[11px] text-muted-foreground">
                                ฿{item.amountBaht.toLocaleString("en-US")}
                              </p>
                            </div>
                            <Input
                              inputMode="numeric"
                              value={item.percent}
                              onChange={(event) =>
                                updateMilestone(index, {
                                  percent: Number(event.target.value) || 0,
                                })
                              }
                              aria-label={`Milestone ${index + 1} percent`}
                            />
                            <Input
                              value={item.deliverable}
                              onChange={(event) =>
                                updateMilestone(index, {
                                  deliverable: event.target.value,
                                })
                              }
                              aria-label={`Milestone ${index + 1} deliverable`}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="mt-0.5"
                              onClick={() =>
                                setMilestones((current) =>
                                  current.filter((_, i) => i !== index)
                                )
                              }
                              aria-label="Remove milestone"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Same payment timeline shown on the user browse Financials tab.
                  Amount auto-updates from budget × %.
                </p>
              </div>
            </section>
          </form>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
