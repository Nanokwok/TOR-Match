"use client"

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react"
import { Search, X } from "lucide-react"

import { searchTorsAction } from "@/actions/tor"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  deadlinePresetLabel,
  durationPresetLabel,
  fiscalYearLabel,
  procurementMethodLabel,
  projectScaleLabel,
} from "@/lib/browse-labels"
import {
  cloneDetailFilters,
  DEADLINE_PRESET_OPTIONS,
  DURATION_PRESET_OPTIONS,
  EMPTY_DETAIL_FILTERS,
  FISCAL_YEAR_OPTIONS,
  PROCUREMENT_METHOD_OPTIONS,
  PROJECT_SCALE_OPTIONS,
} from "@/lib/browse-filters"
import { cn } from "@/lib/utils"
import type {
  TorDetailFilters,
  TorDurationPreset,
  TorListQuery,
  TorProcurementMethod,
  TorProjectScale,
} from "@/types/tor"

type BrowseMoreFiltersDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  baseQuery: Omit<TorListQuery, "detail">
  value: TorDetailFilters
  localOffices: string[]
  onApply: (next: TorDetailFilters) => void
}

export function BrowseMoreFiltersDialog({
  open,
  onOpenChange,
  baseQuery,
  value,
  localOffices,
  onApply,
}: BrowseMoreFiltersDialogProps) {
  const { t } = useLocale()
  const [draft, setDraft] = useState(() => cloneDetailFilters(value))
  const [officeQuery, setOfficeQuery] = useState("")
  const [previewTotal, setPreviewTotal] = useState<number | null>(null)
  const [isCounting, startCount] = useTransition()

  // Reset the draft whenever the dialog opens or the applied filters change.
  // Adjusting state during render (rather than in an effect) avoids the extra
  // render pass React would otherwise have to discard.
  const [lastSync, setLastSync] = useState({ open, value })
  if (lastSync.open !== open || lastSync.value !== value) {
    setLastSync({ open, value })
    if (open) {
      setDraft(cloneDetailFilters(value))
      setOfficeQuery("")
    }
  }

  useEffect(() => {
    if (!open) return

    startCount(async () => {
      const result = await searchTorsAction({
        ...baseQuery,
        detail: draft,
      })
      setPreviewTotal(result.total)
    })
  }, [open, draft, baseQuery])

  const filteredOffices = useMemo(() => {
    const q = officeQuery.trim().toLowerCase()
    if (!q) return localOffices
    return localOffices.filter((office) => office.toLowerCase().includes(q))
  }, [localOffices, officeQuery])

  function toggleScale(scale: TorProjectScale) {
    setDraft((current) => ({
      ...current,
      projectScales: current.projectScales.includes(scale)
        ? current.projectScales.filter((item) => item !== scale)
        : [...current.projectScales, scale],
    }))
  }

  function toggleDuration(preset: TorDurationPreset) {
    setDraft((current) => ({
      ...current,
      durationPresets: current.durationPresets.includes(preset)
        ? current.durationPresets.filter((item) => item !== preset)
        : [...current.durationPresets, preset],
    }))
  }

  function toggleMethod(method: TorProcurementMethod) {
    setDraft((current) => ({
      ...current,
      procurementMethods: current.procurementMethods.includes(method)
        ? current.procurementMethods.filter((item) => item !== method)
        : [...current.procurementMethods, method],
    }))
  }

  function toggleOffice(office: string) {
    setDraft((current) => ({
      ...current,
      localOffices: current.localOffices.includes(office)
        ? current.localOffices.filter((item) => item !== office)
        : [...current.localOffices, office],
    }))
  }

  function handleReset() {
    setDraft(cloneDetailFilters(EMPTY_DETAIL_FILTERS))
  }

  function handleCancel() {
    onOpenChange(false)
  }

  function handleApply() {
    onApply(cloneDetailFilters(draft))
    onOpenChange(false)
  }

  const resultLabel =
    previewTotal == null
      ? t("browse.moreFiltersModal.applyFilters")
      : previewTotal === 1
        ? t("browse.moreFiltersModal.applyFiltersCount", { count: previewTotal })
        : t("browse.moreFiltersModal.applyFiltersCountPlural", {
            count: previewTotal,
          })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,760px)] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>{t("browse.moreFiltersModal.title")}</DialogTitle>
          <DialogDescription>
            {t("browse.moreFiltersModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <FilterSection title={t("browse.moreFiltersModal.projectScale")}>
            <div className="grid gap-2 sm:grid-cols-2">
              {PROJECT_SCALE_OPTIONS.map((option) => (
                <CheckboxRow
                  key={option.value}
                  checked={draft.projectScales.includes(option.value)}
                  label={projectScaleLabel(option.value, t)}
                  onCheckedChange={() => toggleScale(option.value)}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title={t("browse.moreFiltersModal.projectDuration")}>
            <div className="grid gap-2 sm:grid-cols-2">
              {DURATION_PRESET_OPTIONS.map((option) => (
                <CheckboxRow
                  key={option.value}
                  checked={draft.durationPresets.includes(option.value)}
                  label={durationPresetLabel(option.value, t)}
                  onCheckedChange={() => toggleDuration(option.value)}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title={t("browse.moreFiltersModal.exactBudget")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="budget-min">{t("browse.moreFiltersModal.min")}</Label>
                <Input
                  id="budget-min"
                  inputMode="numeric"
                  placeholder={t("browse.moreFiltersModal.budgetMinPlaceholder")}
                  value={draft.budgetMinThb}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      budgetMinThb: event.target.value.replace(/[^\d]/g, ""),
                    }))
                  }
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="budget-max">{t("browse.moreFiltersModal.max")}</Label>
                <Input
                  id="budget-max"
                  inputMode="numeric"
                  placeholder={t("browse.moreFiltersModal.budgetMaxPlaceholder")}
                  value={draft.budgetMaxThb}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      budgetMaxThb: event.target.value.replace(/[^\d]/g, ""),
                    }))
                  }
                  className="h-10"
                />
              </div>
            </div>
          </FilterSection>

          <FilterSection title={t("browse.moreFiltersModal.procurementMethod")}>
            <div className="grid gap-2 sm:grid-cols-2">
              {PROCUREMENT_METHOD_OPTIONS.map((option) => (
                <CheckboxRow
                  key={option.value}
                  checked={draft.procurementMethods.includes(option.value)}
                  label={procurementMethodLabel(option.value, t)}
                  onCheckedChange={() => toggleMethod(option.value)}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title={t("browse.moreFiltersModal.submissionDeadline")}>
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {DEADLINE_PRESET_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      draft.deadlinePreset === option.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        deadlinePreset: option.value,
                      }))
                    }
                  >
                    {deadlinePresetLabel(option.value, t)}
                  </button>
                ))}
              </div>

              {draft.deadlinePreset === "custom" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="deadline-from">
                      {t("browse.moreFiltersModal.from")}
                    </Label>
                    <Input
                      id="deadline-from"
                      type="date"
                      value={draft.deadlineFrom}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          deadlineFrom: event.target.value,
                        }))
                      }
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deadline-to">
                      {t("browse.moreFiltersModal.to")}
                    </Label>
                    <Input
                      id="deadline-to"
                      type="date"
                      value={draft.deadlineTo}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          deadlineTo: event.target.value,
                        }))
                      }
                      className="h-10"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </FilterSection>

          <FilterSection title={t("browse.moreFiltersModal.fiscalYear")}>
            <Select
              value={draft.fiscalYear}
              onValueChange={(next) => {
                if (!next) return
                setDraft((current) => ({ ...current, fiscalYear: next }))
              }}
            >
              <SelectTrigger className="h-10 w-full data-[size=default]:h-10">
                <SelectValue
                  placeholder={t("browse.moreFiltersModal.fiscalYearPlaceholder")}
                >
                  {fiscalYearLabel(draft.fiscalYear, t)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FISCAL_YEAR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {fiscalYearLabel(option.value, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterSection>

          <FilterSection title={t("browse.moreFiltersModal.localOffice")}>
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={officeQuery}
                  onChange={(event) => setOfficeQuery(event.target.value)}
                  placeholder={t("browse.moreFiltersModal.officeSearchPlaceholder")}
                  className="h-10 pl-9"
                />
              </div>

              {draft.localOffices.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {draft.localOffices.map((office) => (
                    <button
                      key={office}
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                      onClick={() => toggleOffice(office)}
                    >
                      {office}
                      <X className="size-3" />
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {filteredOffices.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    {t("browse.moreFiltersModal.noOfficesMatch")}
                  </p>
                ) : (
                  filteredOffices.map((office) => (
                    <CheckboxRow
                      key={office}
                      checked={draft.localOffices.includes(office)}
                      label={office}
                      onCheckedChange={() => toggleOffice(office)}
                    />
                  ))
                )}
              </div>
            </div>
          </FilterSection>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 flex-col items-stretch gap-3 rounded-b-xl border-t border-border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="self-start text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={handleReset}
          >
            {t("browse.moreFiltersModal.resetClearAll")}
          </button>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isCounting && previewTotal == null}
              onClick={handleApply}
            >
              {isCounting && previewTotal == null
                ? t("browse.moreFiltersModal.counting")
                : resultLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FilterSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function CheckboxRow({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean
  label: string
  onCheckedChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted/60">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span>{label}</span>
    </label>
  )
}
