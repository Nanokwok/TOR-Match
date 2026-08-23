import type { WorkspaceChecklistItem } from "@/types/workspace"

const DEFAULT_CHECKLIST_KEYS = [
  "workspace.checklistDefaults.capital",
  "workspace.checklistDefaults.iso",
  "workspace.checklistDefaults.reference",
  "workspace.checklistDefaults.proposal",
  "workspace.checklistDefaults.egp",
] as const

type TranslateFn = (key: string) => string

export function createDefaultChecklist(
  torId: string,
  t?: TranslateFn
): WorkspaceChecklistItem[] {
  const labels = t
    ? DEFAULT_CHECKLIST_KEYS.map((key) => t(key))
    : [
        "Check Registered Capital Criteria (5M > 2M THB)",
        "Verify ISO/IEC 29110 Certificate Expiry",
        "Select Reference Project Contract (#2024-A)",
        "Prepare Price Bidding Proposal (~4.2% below median)",
        "Finalize e-GP Envelopes",
      ]

  return labels.map((label, index) => ({
    id: `${torId}-cl-${index + 1}`,
    label,
    completed: index === 0,
  }))
}
