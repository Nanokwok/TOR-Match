"use client"

import { useState } from "react"
import {
  Award,
  Banknote,
  Building2,
  Check,
  ChevronDown,
  Layers,
  Plus,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
} from "lucide-react"

export function FieldIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "banknote":
      return <Banknote className={className} />
    case "trending-up":
      return <TrendingUp className={className} />
    case "award":
      return <Award className={className} />
    case "building-2":
      return <Building2 className={className} />
    case "shield-check":
      return <ShieldCheck className={className} />
    case "users":
      return <Users className={className} />
    case "layers":
      return <Layers className={className} />
    default:
      return null
  }
}

import {
  CERTIFICATION_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  SPECIALIZATION_OPTIONS,
} from "@/lib/company-setup"
import {
  CRITERIA_FIELD_OPTIONS,
  NUMERIC_OPERATORS,
  SIZE_OPERATORS,
  criteriaLabel,
  defaultCriteriaForType,
  type AutoCriteriaType,
} from "@/lib/qualification-criteria"
import type { QualificationCriteria, NumericOperator } from "@/types/qualification-criteria"
import type { CertificationId, EgPRegistrationStatus, SpecializationId } from "@/types/company-setup"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const EGP_STATUS_OPTIONS: { value: EgPRegistrationStatus; label: string }[] = [
  { value: "registered", label: "Registered on e-GP" },
  { value: "in-progress", label: "Registration in progress" },
  { value: "not-registered", label: "Not registered" },
]

function formatThb(value: number) {
  return value === 0 ? "" : value.toLocaleString("en-US")
}

function parseThb(raw: string): number {
  const stripped = raw.replace(/,/g, "").trim()
  const n = Number(stripped)
  return isNaN(n) ? 0 : Math.max(0, n)
}

function NumberCriteriaEditor({
  op,
  amountThb,
  budgetBaht,
  onChange,
}: {
  op: NumericOperator
  amountThb: number
  budgetBaht?: number
  onChange: (patch: { op?: NumericOperator; amountThb?: number }) => void
}) {
  const presets: { label: string; value: number }[] = []

  if (budgetBaht && budgetBaht > 0) {
    presets.push({
      label: "50% Budget",
      value: Math.round(budgetBaht * 0.5),
    })
    presets.push({
      label: "100% Budget",
      value: budgetBaht,
    })
  }

  presets.push(
    { label: "1M", value: 1_000_000 },
    { label: "2M", value: 2_000_000 },
    { label: "5M", value: 5_000_000 },
    { label: "10M", value: 10_000_000 }
  )

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={op} onValueChange={(v) => onChange({ op: v as NumericOperator })}>
          <SelectTrigger className="h-8 w-28 sm:w-36 text-xs shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NUMERIC_OPERATORS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex items-center flex-1 min-w-[130px] sm:max-w-[200px]">
          <Input
            className="h-8 w-full font-mono text-xs tabular-nums pr-12 font-medium"
            inputMode="numeric"
            placeholder="0"
            value={formatThb(amountThb)}
            onChange={(e) => onChange({ amountThb: parseThb(e.target.value) })}
          />
          <span className="pointer-events-none absolute right-2.5 text-[11px] font-semibold text-muted-foreground">
            THB
          </span>
        </div>
      </div>

      {/* Quick presets row */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[10px] text-muted-foreground mr-0.5">Quick presets:</span>
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange({ amountThb: p.value })}
            className={cn(
              "rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/40",
              amountThb === p.value && "bg-primary/10 text-primary border-primary/50 font-semibold"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}

type MultiSelectOption = { id: string; label: string }

function MultiSelectCriteriaEditor({
  mode,
  selectedIds,
  options,
  customIds,
  showCustom,
  onModeChange,
  onToggleId,
  onAddCustom,
  onRemoveCustom,
}: {
  mode: "any" | "all"
  selectedIds: string[]
  options: MultiSelectOption[]
  customIds?: string[]
  showCustom: boolean
  onModeChange: (m: "any" | "all") => void
  onToggleId: (id: string) => void
  onAddCustom?: (id: string) => void
  onRemoveCustom?: (id: string) => void
}) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [customInput, setCustomInput] = useState("")

  const allSelected = [...selectedIds, ...(customIds ?? [])]

  return (
    <div className="space-y-2">
      {/* AND/OR mode + selected chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={mode} onValueChange={(v) => onModeChange(v as "any" | "all")}>
          <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any" className="text-xs">Any one of</SelectItem>
            <SelectItem value="all" className="text-xs">All of</SelectItem>
          </SelectContent>
        </Select>

        {/* Selected badges */}
        {selectedIds.map((id) => {
          const label = options.find((o) => o.id === id)?.label ?? id
          return (
            <Badge
              key={id}
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal max-w-full"
            >
              <span className="max-w-[200px] truncate">{label}</span>
              <button
                type="button"
                onClick={() => onToggleId(id)}
                className="ml-0.5 rounded hover:text-destructive focus-visible:outline-none shrink-0"
                aria-label={`Remove ${label}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          )
        })}

        {/* Custom ID badges */}
        {(customIds ?? []).map((id) => (
          <Badge
            key={id}
            variant="outline"
            className="gap-1 pr-1 text-xs font-normal text-muted-foreground max-w-full"
          >
            <span className="max-w-[200px] truncate">{id}</span>
            <button
              type="button"
              onClick={() => onRemoveCustom?.(id)}
              className="ml-0.5 rounded hover:text-destructive focus-visible:outline-none shrink-0"
              aria-label={`Remove custom ${id}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}

        {/* Add popover */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
              >
                <Plus className="size-3" />
                Add
                <ChevronDown className="size-3" />
              </Button>
            }
          />
          <PopoverContent className="w-64 p-1" align="start">
            <div className="space-y-0.5">
              {options.map((opt) => {
                const checked = selectedIds.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onToggleId(opt.id)
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs",
                      "hover:bg-accent hover:text-accent-foreground",
                      checked && "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      )}
                    >
                      {checked && <Check className="size-3" />}
                    </span>
                    {opt.label}
                    {checked && (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        added
                      </span>
                    )}
                  </button>
                )
              })}

              {/* Custom ID entry */}
              {showCustom && (
                <div className="mt-1 border-t pt-1">
                  <p className="mb-1 px-2 text-[10px] text-muted-foreground">
                    Custom ID (not in list)
                  </p>
                  <div className="flex gap-1 px-1">
                    <Input
                      className="h-7 text-xs"
                      placeholder="e.g. CMMI-3"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customInput.trim()) {
                          onAddCustom?.(customInput.trim())
                          setCustomInput("")
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={!customInput.trim()}
                      onClick={() => {
                        if (customInput.trim()) {
                          onAddCustom?.(customInput.trim())
                          setCustomInput("")
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {allSelected.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {mode === "any"
            ? "Company must hold at least one of the above."
            : "Company must hold all of the above."}
        </p>
      )}
    </div>
  )
}

export type QualificationCriteriaEditorProps = {
  criteria: QualificationCriteria
  budgetBaht?: number
  onChange: (next: QualificationCriteria) => void
  onTypeChange?: (newType: AutoCriteriaType, fieldLabel: string) => void
}

export function QualificationCriteriaEditor({
  criteria: rawCriteria,
  budgetBaht,
  onChange,
  onTypeChange,
}: QualificationCriteriaEditorProps) {
  // Normalize if incoming criteria is manual (auto items must have auto criteria)
  const criteria =
    rawCriteria.type === "manual"
      ? (defaultCriteriaForType("registered-capital") as Exclude<
        QualificationCriteria,
        { type: "manual" }
      >)
      : rawCriteria

  function handleTypeChange(newType: AutoCriteriaType) {
    if (newType === criteria.type) return
    const nextCriteria = defaultCriteriaForType(newType)
    const opt = CRITERIA_FIELD_OPTIONS.find((o) => o.id === newType)
    onChange(nextCriteria)
    if (opt && onTypeChange) {
      onTypeChange(newType, opt.label)
    }
  }

  const currentOption = CRITERIA_FIELD_OPTIONS.find((o) => o.id === criteria.type)

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
      {/* Header row: Company profile field selector + live preview badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            {currentOption && (
              <FieldIcon name={currentOption.iconName} className="size-4" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Company Field:
            </span>
            <Select
              value={criteria.type}
              onValueChange={(v) =>
                handleTypeChange(v as AutoCriteriaType)
              }
            >
              <SelectTrigger className="h-7 w-auto max-w-full text-xs font-medium bg-background">
                <SelectValue placeholder="Select company field…" />
              </SelectTrigger>
              <SelectContent>
                {CRITERIA_FIELD_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.id}
                    value={opt.id}
                    className="text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FieldIcon name={opt.iconName} className="size-3.5 text-muted-foreground" />
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({opt.companySection})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Live preview badge */}
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 text-xs font-semibold px-2.5 py-0.5 truncate max-w-full"
        >
          {criteriaLabel(criteria)}
        </Badge>
      </div>

      {criteria.type === "registered-capital" && (
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Condition (Minimum Capital)</Label>
          <NumberCriteriaEditor
            op={criteria.op}
            amountThb={criteria.amountThb}
            budgetBaht={budgetBaht}
            onChange={(patch) =>
              onChange({ ...criteria, ...patch } as QualificationCriteria)
            }
          />
        </div>
      )}

      {criteria.type === "past-contract" && (
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Condition (Highest single contract value in same domain)
          </Label>
          <NumberCriteriaEditor
            op={criteria.op}
            amountThb={criteria.amountThb}
            budgetBaht={budgetBaht}
            onChange={(patch) =>
              onChange({ ...criteria, ...patch } as QualificationCriteria)
            }
          />
        </div>
      )}

      {criteria.type === "certification" && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Required certificates</Label>
          <MultiSelectCriteriaEditor
            mode={criteria.mode}
            selectedIds={criteria.ids}
            options={CERTIFICATION_OPTIONS.map((c) => ({
              id: c.id,
              label: c.label,
            }))}
            customIds={criteria.customIds}
            showCustom
            onModeChange={(m) => onChange({ ...criteria, mode: m })}
            onToggleId={(id) => {
              const ids = criteria.ids.includes(id as CertificationId)
                ? criteria.ids.filter((x) => x !== id)
                : [...criteria.ids, id as CertificationId]
              onChange({ ...criteria, ids })
            }}
            onAddCustom={(id) => {
              const customIds = [...(criteria.customIds ?? []), id]
              onChange({ ...criteria, customIds })
            }}
            onRemoveCustom={(id) => {
              const customIds = (criteria.customIds ?? []).filter((x) => x !== id)
              onChange({ ...criteria, customIds })
            }}
          />
        </div>
      )}

      {criteria.type === "egp-registered" && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Required e-GP status</Label>
          <Select
            value={criteria.requiredStatus}
            onValueChange={(v) =>
              onChange({
                ...criteria,
                requiredStatus: v as EgPRegistrationStatus,
              })
            }
          >
            <SelectTrigger className="h-8 w-full max-w-xs text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EGP_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {criteria.type === "company-size" && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Condition</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={criteria.op}
              onValueChange={(v) =>
                onChange({ ...criteria, op: v as "=" | ">=" })
              }
            >
              <SelectTrigger className="h-8 w-full sm:w-28 flex-1 sm:flex-initial text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPERATORS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={criteria.size}
              onValueChange={(v) =>
                onChange({
                  ...criteria,
                  size: v as typeof criteria.size,
                })
              }
            >
              <SelectTrigger className="h-8 w-full sm:w-44 flex-1 sm:flex-initial text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_SIZE_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-xs"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {criteria.type === "specialization" && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Required specializations</Label>
          <MultiSelectCriteriaEditor
            mode={criteria.mode}
            selectedIds={criteria.ids}
            options={SPECIALIZATION_OPTIONS.map((s) => ({
              id: s.id,
              label: s.label,
            }))}
            showCustom={false}
            onModeChange={(m) => onChange({ ...criteria, mode: m })}
            onToggleId={(id) => {
              const ids = criteria.ids.includes(id as SpecializationId)
                ? criteria.ids.filter((x) => x !== id)
                : [...criteria.ids, id as SpecializationId]
              onChange({ ...criteria, ids })
            }}
          />
        </div>
      )}

      {criteria.type === "not-blacklisted" && (
        <p className="text-xs text-muted-foreground">
          Company must declare they are <strong>not blacklisted</strong> on their profile.
        </p>
      )}
    </div>
  )
}
