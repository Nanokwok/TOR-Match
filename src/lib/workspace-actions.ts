import type { WorkspaceColumnId } from "@/types/workspace"

/**
 * Workspace UI action stubs.
 * Replace console.log bodies with real navigation / mutations later.
 */
export const workspaceActions = {
  seeFullTor(torId: string) {
    console.log("Action clicked: See full TOR", { torId })
  },
  addTorById(torId: string) {
    console.log("Action clicked: Add TOR by ID", { torId })
  },
  addNewTor() {
    console.log("Action clicked: Add New TOR")
  },
  addCardToColumn(column: WorkspaceColumnId) {
    console.log("Action clicked: New card in column", { column })
  },
  addToColumnHeader(column: WorkspaceColumnId) {
    console.log("Action clicked: Add to column header", { column })
  },
  addCustomAssignee(name: string) {
    console.log("Action clicked: Add custom assignee", { name })
  },
} as const
