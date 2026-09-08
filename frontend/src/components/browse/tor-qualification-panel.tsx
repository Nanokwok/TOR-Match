"use client"

import { useRouter } from "next/navigation"
import { Settings } from "lucide-react"

import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import type { TorQualificationCheck } from "@/types/tor"
import { localizedKey, pickLocalized } from "@/lib/localized-content"
import { cn } from "@/lib/utils"

type TorQualificationPanelProps = {
  check: TorQualificationCheck
}

type QualificationRow = TorQualificationCheck["rows"][number]

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

function ProfileCell({
  row,
  profileSetup,
  showSetupPrompt,
}: {
  row: QualificationRow
  profileSetup: boolean
  showSetupPrompt?: boolean
}) {
  const router = useRouter()
  const { t } = useLocale()

  if (!row.autoCheckable) {
    return (
      <span className="text-sm text-muted-foreground italic">
        {t("browse.qualificationPanel.selfAssessment")}
      </span>
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

  if (!row.companyValue) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  return (
    <span
      className={cn(
        "font-medium",
        row.passed ? "text-emerald-600" : "text-red-600"
      )}
    >
      {row.passed ? "✓" : "✗"} {row.companyValue}
    </span>
  )
}

function RequirementRows({
  rows,
  profileSetup,
  showSetupPrompt = false,
}: {
  rows: QualificationRow[]
  profileSetup: boolean
  showSetupPrompt?: boolean
}) {
  const { locale } = useLocale()

  return rows.map((row, index) => (
    <tr
      key={localizedKey(row.requirement)}
      className="border-t border-border bg-card"
    >
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
        />
      </td>
    </tr>
  ))
}

export function TorQualificationPanel({ check }: TorQualificationPanelProps) {
  const { t } = useLocale()
  const autoRows = check.rows.filter((row) => row.autoCheckable)
  const manualRows = check.rows.filter((row) => !row.autoCheckable)

  return (
    <div className="overflow-hidden rounded-lg border border-border">
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
          {autoRows.length > 0 ? (
            <>
              <SectionHeaderRow
                label={t("browse.qualificationPanel.autoVerified")}
              />
              <RequirementRows
                rows={autoRows}
                profileSetup={check.profileSetup}
                showSetupPrompt={!check.profileSetup}
              />
            </>
          ) : null}

          {manualRows.length > 0 ? (
            <>
              <SectionHeaderRow
                label={t("browse.qualificationPanel.manualReview")}
              />
              <RequirementRows
                rows={manualRows}
                profileSetup={check.profileSetup}
              />
            </>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
