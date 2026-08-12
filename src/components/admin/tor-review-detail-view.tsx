"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, X } from "lucide-react"

import {
  createEmptyMilestone,
  createEmptyQualification,
  type TorReviewDetail,
} from "@/server/db/mock/admin-tor-review"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type {
  TorPaymentMilestone,
  TorProcurementMethod,
  TorProcurementStatus,
  TorProjectScale,
  TorQualificationRequirement,
} from "@/types/tor"

type TorReviewDetailViewProps = {
  tor: TorReviewDetail
  departments: string[]
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
  const [durationLabel, setDurationLabel] = useState(tor.durationLabel)
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
  const [milestones, setMilestones] = useState(tor.milestones)
  const [qualifications, setQualifications] = useState(
    tor.qualificationRequirements
  )
  const [message, setMessage] = useState<string | null>(null)

  const budgetNumber = Number(budget) || 0

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

  function updateMilestone(
    index: number,
    patch: Partial<TorPaymentMilestone>
  ) {
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
    patch: Partial<TorQualificationRequirement>
  ) {
    setQualifications((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  function handleSaveDraft() {
    setMessage("Draft saved (frontend only).")
  }

  function handleApprove() {
    setMessage("Approved & published (frontend only).")
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
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
            {announcementId}: {projectTitleEn}
          </h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            Save Draft
          </Button>
          <Button onClick={handleApprove}>Approve & Publish</Button>
        </div>
      </div>

      {message ? (
        <p className="shrink-0 border-b bg-muted/40 px-4 py-2 text-sm text-muted-foreground sm:px-6">
          {message}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1">
        <div className="min-h-0 overflow-hidden border-b bg-muted/30 lg:border-r lg:border-b-0">
          <iframe
            title={`TOR PDF ${announcementId}`}
            src={tor.pdfUrl}
            className="h-full w-full"
          />
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <form
            className="space-y-8"
            onSubmit={(event) => {
              event.preventDefault()
              handleSaveDraft()
            }}
          >
            <section className="space-y-4">
              <h2 className="text-sm font-semibold tracking-tight">
                1. General Metadata
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="duration-days">Duration (days)</Label>
                  <Input
                    id="duration-days"
                    inputMode="numeric"
                    value={durationDays}
                    onChange={(event) => {
                      const next = event.target.value
                      setDurationDays(next)
                      const days = Number(next)
                      if (days > 0) {
                        const months = Math.round(days / 30)
                        setDurationLabel(
                          `${days} Days (${months} Month${months === 1 ? "" : "s"})`
                        )
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration-label">Duration Label</Label>
                  <Input
                    id="duration-label"
                    value={durationLabel}
                    onChange={(event) => setDurationLabel(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Submission Deadline</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="announced">Announcement Date</Label>
                  <Input
                    id="announced"
                    type="datetime-local"
                    value={announcementDate}
                    onChange={(event) => setAnnouncementDate(event.target.value)}
                  />
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
                    placeholder="Add a tag and press Enter"
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
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold tracking-tight">
                3. Qualification Requirements
              </h2>
              <div className="space-y-3">
                {qualifications.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <div className="space-y-1.5">
                      <Label>Requirement</Label>
                      <Input
                        value={item.requirement}
                        onChange={(event) =>
                          updateQualification(index, {
                            requirement: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>TOR Criteria</Label>
                      <Input
                        value={item.torCriteria}
                        onChange={(event) =>
                          updateQualification(index, {
                            torCriteria: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setQualifications((current) =>
                            current.filter((_, i) => i !== index)
                          )
                        }
                        aria-label="Remove qualification"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setQualifications((current) => [
                    ...current,
                    createEmptyQualification(),
                  ])
                }
              >
                <Plus data-icon="inline-start" />
                Add requirement
              </Button>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold tracking-tight">
                4. Financials & Payment Timeline
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="budget">Total Budget (THB)</Label>
                  <Input
                    id="budget"
                    inputMode="numeric"
                    value={budget}
                    onChange={(event) => {
                      const next = event.target.value
                      setBudget(next)
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="median-price">Median Price (THB)</Label>
                  <Input
                    id="median-price"
                    inputMode="numeric"
                    value={medianPrice}
                    onChange={(event) => setMedianPrice(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Payment Milestones (Timeline)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setMilestones((current) => [
                        ...current,
                        createEmptyMilestone(
                          current.length + 1,
                          budgetNumber
                        ),
                      ])
                    }
                  >
                    <Plus data-icon="inline-start" />
                    Add milestone
                  </Button>
                </div>

                <div className="overflow-hidden rounded-lg border">
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
                <p className="text-xs text-muted-foreground">
                  Same payment timeline shown on the user browse Financials tab.
                  Amount auto-updates from budget × %.
                </p>
              </div>
            </section>
          </form>
        </div>
      </div>
    </div>
  )
}
