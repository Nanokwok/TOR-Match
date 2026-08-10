import type { TorPriority } from "@/types/tor"

export type WorkspaceColumnId = "bookmark" | "todo" | "in-progress" | "done"

export type TeamMember = {
  id: string
  name: string
  initials: string
}

export type WorkspaceCard = {
  torId: string
  announcementNo: string
  title: string
  department: string
  budgetBaht: number
  deadline: string
  priority: TorPriority
  column: WorkspaceColumnId
  assigneeIds: string[]
}

export type WorkspaceChecklistItem = {
  id: string
  label: string
  completed: boolean
}

export type WorkspaceBoard = {
  cards: WorkspaceCard[]
  members: TeamMember[]
}

export type WorkspaceQuery = {
  keyword?: string
  assigneeId?: string | "all"
  priority?: TorPriority | "all"
}

export type WorkspaceBoardResult = {
  columns: Record<WorkspaceColumnId, WorkspaceCard[]>
  members: TeamMember[]
  total: number
}

export const WORKSPACE_COLUMNS: {
  id: WorkspaceColumnId
  label: string
}[] = [
  { id: "bookmark", label: "Bookmark" },
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "done", label: "Done" },
]
