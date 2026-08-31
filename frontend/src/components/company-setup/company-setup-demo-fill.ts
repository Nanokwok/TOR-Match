/**
 * DEMO ONLY — Company setup autofill (Alt/Option + D).
 *
 * To remove later:
 * 1. Delete this file.
 * 2. Remove the import + hook call in `company-setup-wizard.tsx`
 *    (search for "DEMO ONLY").
 */
"use client"

import { useEffect } from "react"

import {
  CERTIFICATION_OPTIONS,
  createEmptyPastProject,
} from "@/lib/company-setup"
import type { CompanySetupProfile } from "@/types/company-setup"

/** Flip to `false` for a quick disable without deleting files. */
export const ENABLE_COMPANY_SETUP_DEMO_FILL = true

export function createCompanySetupDemoProfile(): CompanySetupProfile {
  const selectedCertIds = new Set(["iso-29110", "iso-27001"])

  return {
    companyNameThai: "บริษัท นานาเทค จำกัด",
    companyNameEnglish: "NaNaTech Co., Ltd.",
    taxId: "0105565012345",
    companySize: "micro",
    contactEmail: "bidding@nanatech.co.th",
    phone: "0987654321",
    registeredCapitalThb: "5000000",
    egpStatus: "registered",
    notBlacklisted: true,
    certifications: CERTIFICATION_OPTIONS.map((option) => {
      const selected = selectedCertIds.has(option.id)
      return {
        id: option.id,
        selected,
        certificateNumber: selected
          ? option.id === "iso-29110"
            ? "TH-29110-2024-8841"
            : "TH-27001-2025-1022"
          : "",
        expirationDate: selected ? "2027-12-31" : "",
      }
    }),
    pastProjects: [
      {
        ...createEmptyPastProject("demo-project-1"),
        title: "BMA Digital Service Portal Maintenance",
        clientSector: "government",
        contractValueThb: "2000000",
        completionYear: "2025",
      },
    ],
    techStack: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Node.js"],
    specializations: ["software-development", "data-ai"],
  }
}

export function useCompanySetupDemoFill(
  onFill: (profile: CompanySetupProfile) => void
) {
  useEffect(() => {
    if (!ENABLE_COMPANY_SETUP_DEMO_FILL) return

    function handleKeyDown(event: KeyboardEvent) {
      // Prefer `code` so macOS Option+D still matches (key may become "∂").
      if (!event.altKey || event.code !== "KeyD") return
      if (event.ctrlKey || event.metaKey || event.shiftKey) return

      event.preventDefault()
      onFill(createCompanySetupDemoProfile())
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onFill])
}
