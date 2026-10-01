"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Settings } from "lucide-react"

import { saveSelfCheckAction } from "@/actions/self-check"
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
import type { TorQualificationCheck, TorQualificationRow } from "@/types/tor"
import { pickLocalized } from "@/lib/localized-content"
import { cn } from "@/lib/utils"

type TorQualificationPanelProps = {
  torId: string
  check: TorQualificationCheck
  onDirtyChange?: (isDirty: boolean) => void
}

type QualificationRow = TorQualificationRow

function SectionHeaderRow({ label }: { label: string }) {
  return (
    <tr className="border-t border-border bg-muted/60">
      <td
        colSpan={3}
        className="px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {label}
      </td>
    </tr>
  )
}

function SelfAssessmentCell({
  row,
  checked,
  onCheckedChange,
  onNavigate,
}: {
  row: QualificationRow
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  onNavigate: (url: string) => void
}) {
  const { t, locale } = useLocale()

  return (
    <div className="space-y-2">
      {row.profileField && !row.profileField.filled ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs text-muted-foreground">
          <span>
            {t("browse.qualificationPanel.missingProfileField").replace(
              "{field}",
              pickLocalized(row.profileField.label, locale)
            )}
          </span>
          <Button
            variant="link"
            className="h-auto p-0 text-xs font-medium text-primary shrink-0"
            onClick={() =>
              onNavigate(`/company-setup?edit=1&step=${row.profileField!.wizardStep}`)
            }
          >
            {t("browse.qualificationPanel.addToProfile")}
          </Button>
        </div>
      ) : null}

      {row.selfCheckStale ? (
        <p className="rounded bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          {t("browse.qualificationPanel.staleAnswer")}
        </p>
      ) : null}

      <label
        className={cn(
          "flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-all select-none",
          checked
            ? "border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20"
            : "border-border bg-card hover:bg-muted/40"
        )}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          aria-label={t("browse.qualificationPanel.weComply")}
        />
        <span
          className={cn(
            "text-xs font-medium leading-none",
            checked
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-foreground"
          )}
        >
          {t("browse.qualificationPanel.weComply")}
        </span>
      </label>
    </div>
  )
}

function ProfileCell({
  row,
  profileSetup,
  showSetupPrompt,
  selfAssessed,
  onSelfAssessChange,
  onNavigate,
}: {
  row: QualificationRow
  profileSetup: boolean
  showSetupPrompt?: boolean
  selfAssessed: boolean
  onSelfAssessChange: (checked: boolean) => void
  onNavigate: (url: string) => void
}) {
  const { t, locale } = useLocale()

  if (row.selfCheckable) {
    return (
      <SelfAssessmentCell
        row={row}
        checked={selfAssessed}
        onCheckedChange={onSelfAssessChange}
        onNavigate={onNavigate}
      />
    )
  }

  if (!profileSetup) {
    if (!showSetupPrompt) {
      return <span className="text-sm text-muted-foreground">—</span>
    }

    return (
      <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/50 px-4 py-6 text-center">
        <Settings className="size-6 text-muted-foreground" />
        <p className="max-w-[220px] text-xs text-muted-foreground leading-relaxed">
          {t("browse.qualificationPanel.setupPrompt")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium text-primary hover:text-primary"
          onClick={() => onNavigate("/company-profile")}
        >
          {t("browse.qualificationPanel.companySetup")}
        </Button>
      </div>
    )
  }

  let statusBadge = (
    <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
      {t(`browse.qualificationStatus.${row.status}`)}
    </span>
  )

  if (row.status === "passed") {
    statusBadge = (
      <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        {t("browse.qualificationStatus.passed")}
      </span>
    )
  } else if (row.status === "failed") {
    statusBadge = (
      <span className="inline-flex items-center rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
        {t("browse.qualificationStatus.failed")}
      </span>
    )
  }

  const isBooleanValue =
    row.companyValue?.trim().toLowerCase() === "true" ||
    row.companyValue?.trim().toLowerCase() === "false"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {statusBadge}
        {row.companyValue && !isBooleanValue ? (
          <span className="text-xs font-semibold text-foreground">
            {row.companyValue}
          </span>
        ) : null}
      </div>
      {row.reason ? (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {pickLocalized(row.reason, locale)}
        </p>
      ) : null}
    </div>
  )
}

function CriteriaCell({
  text,
  readMoreLabel,
  showLessLabel,
}: {
  text: string
  readMoreLabel: string
  showLessLabel: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [truncatedText, setTruncatedText] = useState("")
  const measureRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = measureRef.current
    if (!el) return

    const compute = () => {
      // 1. Measure if the full text exceeds 2 lines
      el.textContent = text
      const computed = window.getComputedStyle(el)
      const lineHeight = parseFloat(computed.lineHeight) || 20
      const max2LinesHeight = lineHeight * 2 + 2

      if (el.scrollHeight <= max2LinesHeight) {
        setIsOverflowing(false)
        setTruncatedText(text)
        return
      }

      setIsOverflowing(true)

      // 2. Binary search for cutoff point so `truncated + "… " + readMoreLabel` fits on line 2
      let low = 0
      let high = text.length
      let best = 0
      const suffix = "… " + readMoreLabel

      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        el.textContent = text.slice(0, mid) + suffix
        if (el.scrollHeight <= max2LinesHeight) {
          best = mid
          low = mid + 1
        } else {
          high = mid - 1
        }
      }

      setTruncatedText(text.slice(0, best).trimEnd())
      el.textContent = ""
    }

    compute()

    const observer = new ResizeObserver(() => {
      compute()
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [text, readMoreLabel])

  if (!isOverflowing) {
    return (
      <div className="relative">
        <p className="leading-relaxed text-muted-foreground">{text}</p>
        <p
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute inset-x-0 top-0 leading-relaxed text-muted-foreground"
        />
      </div>
    )
  }

  return (
    <div className="relative">
      <p className="leading-relaxed text-muted-foreground">
        {isExpanded ? (
          <>
            {text}{" "}
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="inline cursor-pointer font-medium text-primary hover:underline focus-visible:outline-none"
            >
              {showLessLabel}
            </button>
          </>
        ) : (
          <>
            {truncatedText}…{" "}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="inline cursor-pointer font-medium text-primary hover:underline focus-visible:outline-none"
            >
              {readMoreLabel}
            </button>
          </>
        )}
      </p>

      {/* Hidden measurement target with identical width & font styles */}
      <p
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute inset-x-0 top-0 leading-relaxed text-muted-foreground"
      />
    </div>
  )
}

function RequirementRows({
  rows,
  profileSetup,
  showSetupPrompt = false,
  selfAssessedById,
  onSelfAssessChange,
  onNavigate,
}: {
  rows: QualificationRow[]
  profileSetup: boolean
  showSetupPrompt?: boolean
  selfAssessedById: Record<string, boolean>
  onSelfAssessChange: (requirementId: string, checked: boolean) => void
  onNavigate: (url: string) => void
}) {
  const { locale, t } = useLocale()

  return rows.map((row, index) => (
    <tr key={row.requirementId} className="border-t border-border bg-card">
      <td className="px-4 py-3.5 font-medium text-foreground align-top">
        {pickLocalized(row.requirement, locale)}
      </td>
      <td className="px-4 py-3.5 align-top">
        <CriteriaCell
          text={pickLocalized(row.torCriteria, locale)}
          readMoreLabel={t("browse.qualificationPanel.readMore")}
          showLessLabel={t("browse.qualificationPanel.showLess")}
        />
      </td>
      <td className="px-4 py-3.5 align-top">
        <ProfileCell
          row={row}
          profileSetup={profileSetup}
          showSetupPrompt={showSetupPrompt && index === 0}
          selfAssessed={selfAssessedById[row.requirementId] === true}
          onSelfAssessChange={(checked) => onSelfAssessChange(row.requirementId, checked)}
          onNavigate={onNavigate}
        />
      </td>
    </tr>
  ))
}

/** Only rows the bidder actually answered are stored, so a blank sheet stays blank. */
function answersFrom(check: TorQualificationCheck): Record<string, boolean> {
  const initial: Record<string, boolean> = {}
  for (const row of check.rows) {
    if (row.selfCheckable && row.selfCheckAnswer !== null) {
      initial[row.requirementId] = row.selfCheckAnswer
    }
  }
  return initial
}

export function TorQualificationPanel({
  torId,
  check: initialCheck,
  onDirtyChange,
}: TorQualificationPanelProps) {
  const router = useRouter()
  const { t } = useLocale()
  const [shownCheck, setShownCheck] = useState(initialCheck)
  const [check, setCheck] = useState(initialCheck)
  const [answers, setAnswers] = useState(() => answersFrom(initialCheck))
  const [saved, setSaved] = useState(() => answersFrom(initialCheck))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  // The panel stays mounted while the reader moves between TORs, so a new check
  // has to replace the draft rather than being merged into it. Adjusted during
  // render rather than in an effect: an effect would paint the previous TOR's
  // answers first, and React re-runs this before anything reaches the screen.
  if (shownCheck !== initialCheck) {
    setShownCheck(initialCheck)
    setCheck(initialCheck)
    setAnswers(answersFrom(initialCheck))
    setSaved(answersFrom(initialCheck))
    setError(null)
  }

  // The rows the system can answer itself, and the rows it has to ask about.
  // Split on `selfCheckable`, not `autoCheckable`: a capital requirement whose
  // profile field is empty belongs with the questions, not with the verdicts.
  const verifiedRows = check.rows.filter((row) => !row.selfCheckable)
  const askedRows = check.rows.filter((row) => row.selfCheckable)

  const isDirty = JSON.stringify(answers) !== JSON.stringify(saved)

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    return () => {
      onDirtyChange?.(false)
    }
  }, [onDirtyChange])

  useEffect(() => {
    if (!isDirty) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  function handleSelfAssessChange(requirementId: string, checked: boolean) {
    setAnswers((previous) => ({ ...previous, [requirementId]: checked }))
  }

  function handleNavigate(url: string) {
    if (isDirty) {
      setPendingAction(() => () => router.push(url))
      setShowDiscardModal(true)
    } else {
      router.push(url)
    }
  }

  function handleConfirmDiscard() {
    setShowDiscardModal(false)
    setAnswers(saved)
    if (pendingAction) {
      const act = pendingAction
      setPendingAction(null)
      act()
    }
  }

  function handleSave() {
    setError(null)
    const entries = Object.entries(answers).map(([requirementId, answer]) => ({
      requirementId,
      answer,
    }))
    startTransition(async () => {
      const result = await saveSelfCheckAction(torId, entries)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSaved(answers)
      if (result.check) setCheck(result.check)
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="space-y-1 border-b border-border bg-muted/50 p-4 text-sm">
        <p>
          {t("browse.qualificationPanel.scopeNote")}
          {check.requiresManualReview ? ` ${t("browse.qualificationPanel.pendingReview")}` : ""}
        </p>
        {check.missingProfileFields > 0 ? (
          <p className="text-muted-foreground">
            {t("browse.qualificationPanel.missingCount")
              .replace("{count}", String(check.missingProfileFields))
              .replace("{total}", String(check.rows.length))}
          </p>
        ) : null}
      </div>
      <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm">
        <thead>
          <tr className="bg-primary text-primary-foreground">
            <th className="w-[25%] px-4 py-3 font-medium">
              {t("browse.qualificationPanel.requirement")}
            </th>
            <th className="w-[55%] px-4 py-3 font-medium">
              {t("browse.qualificationPanel.torCriteria")}
            </th>
            <th className="w-[20%] px-4 py-3 font-medium">
              {t("browse.qualificationPanel.companyProfile")}
            </th>
          </tr>
        </thead>
        <tbody>
          {verifiedRows.length > 0 ? (
            <>
              <SectionHeaderRow
                label={t("browse.qualificationPanel.autoVerified")}
              />
              <RequirementRows
                rows={verifiedRows}
                profileSetup={check.profileSetup}
                showSetupPrompt={!check.profileSetup}
                selfAssessedById={answers}
                onSelfAssessChange={handleSelfAssessChange}
                onNavigate={handleNavigate}
              />
            </>
          ) : null}

          {askedRows.length > 0 ? (
            <>
              <SectionHeaderRow
                label={t("browse.qualificationPanel.manualReview")}
              />
              <RequirementRows
                rows={askedRows}
                profileSetup={check.profileSetup}
                selfAssessedById={answers}
                onSelfAssessChange={handleSelfAssessChange}
                onNavigate={handleNavigate}
              />
            </>
          ) : null}
        </tbody>
      </table>

      {askedRows.length > 0 && check.profileSetup ? (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border bg-muted/40 px-4 py-3 text-sm">
          {error ? <span className="mr-auto text-red-600">{error}</span> : null}
          {!error && isDirty ? (
            <span className="mr-auto text-muted-foreground">
              {t("browse.qualificationPanel.unsavedChanges")}
            </span>
          ) : null}
          {!error && !isDirty && check.readyToBid ? (
            <span className="mr-auto font-medium text-emerald-600">
              {t("browse.qualificationPanel.readyToBid")}
            </span>
          ) : null}
          <Button size="sm" onClick={handleSave} disabled={!isDirty || pending}>
            {pending
              ? t("browse.qualificationPanel.saving")
              : t("browse.qualificationPanel.save")}
          </Button>
        </div>
      ) : null}

      <Dialog open={showDiscardModal} onOpenChange={setShowDiscardModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("browse.qualificationPanel.discardChangesTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("browse.qualificationPanel.discardChangesDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDiscardModal(false)
                setPendingAction(null)
              }}
            >
              {t("browse.qualificationPanel.keepEditing")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDiscard}
            >
              {t("browse.qualificationPanel.discardAndExit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
