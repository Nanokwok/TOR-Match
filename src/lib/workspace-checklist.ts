import type { WorkspaceChecklistItem } from "@/types/workspace"

const DEFAULT_CHECKLIST_TEMPLATE = [
  "Check Registered Capital Criteria (5M > 2M THB)",
  "Verify ISO/IEC 29110 Certificate Expiry",
  "Select Reference Project Contract (#2024-A)",
  "Prepare Price Bidding Proposal (~4.2% below median)",
  "Finalize e-GP Envelopes",
] as const

export function createDefaultChecklist(torId: string): WorkspaceChecklistItem[] {
  return DEFAULT_CHECKLIST_TEMPLATE.map((label, index) => ({
    id: `${torId}-cl-${index + 1}`,
    label,
    completed: index === 0,
  }))
}
