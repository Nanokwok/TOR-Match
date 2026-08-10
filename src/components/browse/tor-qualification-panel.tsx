"use client"

import { Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { browseActions } from "@/lib/browse-actions"
import type { TorQualificationCheck } from "@/types/tor"

type TorQualificationPanelProps = {
  check: TorQualificationCheck
}

export function TorQualificationPanel({ check }: TorQualificationPanelProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-[#0088C9] text-white">
            <th className="px-4 py-3 font-medium">Qualification Requirement</th>
            <th className="px-4 py-3 font-medium">TOR Minimum Criteria</th>
            <th className="px-4 py-3 font-medium">Your Company Profile</th>
          </tr>
        </thead>
        <tbody>
          {check.profileSetup ? (
            check.rows.map((row) => (
              <tr
                key={row.requirement}
                className="border-t border-border bg-white"
              >
                <td className="px-4 py-3 font-medium text-neutral-950">
                  {row.requirement}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.torCriteria}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      row.passed
                        ? "font-medium text-emerald-600"
                        : "font-medium text-red-600"
                    }
                  >
                    {row.passed ? "✓" : "✗"} {row.companyValue}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="border-t border-border px-4 py-3 align-top font-medium text-neutral-950">
                <div className="space-y-6 py-1">
                  {check.rows.map((row) => (
                    <div key={row.requirement}>{row.requirement}</div>
                  ))}
                </div>
              </td>
              <td className="border-t border-border px-4 py-3 align-top text-muted-foreground">
                <div className="space-y-6 py-1">
                  {check.rows.map((row) => (
                    <div key={row.requirement}>{row.torCriteria}</div>
                  ))}
                </div>
              </td>
              <td
                className="border-t border-border p-3 align-middle"
                rowSpan={1}
              >
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg bg-muted/70 px-6 py-8 text-center">
                  <Settings className="size-8 text-muted-foreground" />
                  <p className="max-w-[220px] text-sm text-muted-foreground">
                    Set up your company profile to easily verify eligibility
                  </p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-[#0088C9]"
                    onClick={() => browseActions.companySetup()}
                  >
                    Company Setup →
                  </Button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
