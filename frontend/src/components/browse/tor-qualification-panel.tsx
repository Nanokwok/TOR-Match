"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Settings } from "lucide-react"

import { saveSelfCheckAction } from "@/actions/self-check"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { TorQualificationCheck, TorQualificationRow } from "@/types/tor"
import { pickLocalized } from "@/lib/localized-content"
import { cn } from "@/lib/utils"

type TorQualificationPanelProps = {
  torId: string
  check: TorQualificationCheck
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
}: {
  row: QualificationRow
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const router = useRouter()
  const { t, locale } = useLocale()

  return (
    <div className="space-y-2">
      {/* The profile could answer this kind of requirement — it just has
          nothing in the field yet. Filling it in beats self-certifying, so
          offer that first and keep the checkbox as the fallback. */}
      {row.profileField && !row.profileField.filled ? (
        <p className="text-xs text-muted-foreground">
          {t("browse.qualificationPanel.missingProfileField").replace(
            "{field}",
            pickLocalized(row.profileField.label, locale)
          )}{" "}
          <Button
            variant="link"
            className="h-auto p-0 text-xs text-primary"
            onClick={() =>
              // To the step that holds the field. Not to the field itself:
              // several of them are groups (certifications, past projects)
              // with no single input to land on.
              router.push(`/company-setup?edit=1&step=${row.profileField!.wizardStep}`)
            }
          >
            {t("browse.qualificationPanel.addToProfile")}
          </Button>
        </p>
      ) : null}

      {row.selfCheckStale ? (
        <p className="text-xs font-medium text-amber-600">
          {t("browse.qualificationPanel.staleAnswer")}
        </p>
      ) : null}

      <label className="flex cursor-pointer items-start gap-2.5">
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          className="mt-0.5"
          aria-label={t("browse.qualificationPanel.weComply")}
        />
        <span
          className={cn(
            "text-sm leading-snug",
            checked
              ? "font-medium text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
          )}
        >
          {checked
            ? `✓ ${t("browse.qualificationPanel.weComply")}`
            : t("browse.qualificationPanel.weComply")}
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
}: {
  row: QualificationRow
  profileSetup: boolean
  showSetupPrompt?: boolean
  selfAssessed: boolean
  onSelfAssessChange: (checked: boolean) => void
}) {
  const router = useRouter()
  const { t, locale } = useLocale()

  if (row.selfCheckable) {
    return (
      <SelfAssessmentCell
        row={row}
        checked={selfAssessed}
        onCheckedChange={onSelfAssessChange}
      />
    )
  }

  if (!profileSetup) {
    if (!showSetupPrompt) {
      return <span className="text-sm text-muted-foreground">—</span>
    }

    return (
      <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-lg bg-muted/70 px-4 py-6 text-center">
        <Settings className="size-7 text-muted-foreground" />
        <p className="max-w-[220px] text-sm text-muted-foreground">
          {t("browse.qualificationPanel.setupPrompt")}
        </p>
        <Button
          variant="link"
          className="h-auto p-0 text-primary"
          onClick={() => router.push("/company-profile")}
        >
          {t("browse.qualificationPanel.companySetup")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <p className={cn("font-medium", row.status === "passed" ? "text-emerald-600" : row.status === "failed" ? "text-red-600" : "text-amber-600")}>
        {t(`browse.qualificationStatus.${row.status}`)}
      </p>
      {row.companyValue ? <p>{row.companyValue}</p> : null}
      <p className="text-xs text-muted-foreground">{pickLocalized(row.reason, locale)}</p>
    </div>
  )
}

function RequirementRows({
  rows,
  profileSetup,
  showSetupPrompt = false,
  selfAssessedById,
  onSelfAssessChange,
}: {
  rows: QualificationRow[]
  profileSetup: boolean
  showSetupPrompt?: boolean
  selfAssessedById: Record<string, boolean>
  onSelfAssessChange: (requirementId: string, checked: boolean) => void
}) {
  const { locale } = useLocale()

  return rows.map((row, index) => (
    <tr key={row.requirementId} className="border-t border-border bg-card">
      <td className="px-4 py-3 font-medium text-foreground">
        {pickLocalized(row.requirement, locale)}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {pickLocalized(row.torCriteria, locale)}
      </td>
      <td className="px-4 py-3">
        <ProfileCell
          row={row}
          profileSetup={profileSetup}
          showSetupPrompt={showSetupPrompt && index === 0}
          selfAssessed={selfAssessedById[row.requirementId] === true}
          onSelfAssessChange={(checked) => onSelfAssessChange(row.requirementId, checked)}
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

export function TorQualificationPanel({ torId, check: initialCheck }: TorQualificationPanelProps) {
  const { t } = useLocale()
  const [shownCheck, setShownCheck] = useState(initialCheck)
  const [check, setCheck] = useState(initialCheck)
  const [answers, setAnswers] = useState(() => answersFrom(initialCheck))
  const [saved, setSaved] = useState(() => answersFrom(initialCheck))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

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

  function handleSelfAssessChange(requirementId: string, checked: boolean) {
    setAnswers((previous) => ({ ...previous, [requirementId]: checked }))
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
    <div className="overflow-hidden rounded-lg border border-border">
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
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-primary text-primary-foreground">
            <th className="px-4 py-3 font-medium">
              {t("browse.qualificationPanel.requirement")}
            </th>
            <th className="px-4 py-3 font-medium">
              {t("browse.qualificationPanel.torCriteria")}
            </th>
            <th className="px-4 py-3 font-medium">
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
    </div>
  )
}
