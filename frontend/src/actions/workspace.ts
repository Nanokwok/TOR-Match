"use server"

import {
  addTorToWorkspace,
  bookmarkTor,
  getWorkspaceBoard,
  listWorkspaceAssignees,
  moveWorkspaceCard,
  removeWorkspaceCard,
  searchTorsForWorkspace,
  updateWorkspaceCard,
} from "@/server/services/workspace.service"
import type { WorkspaceCard, WorkspaceColumnId, WorkspaceQuery } from "@/types/workspace"

export async function getWorkspaceBoardAction(query: WorkspaceQuery = {}) {
  return getWorkspaceBoard(query)
}

export async function getWorkspaceAssigneesAction() {
  return listWorkspaceAssignees()
}

export async function moveWorkspaceCardAction(
  torId: string,
  toColumn: WorkspaceColumnId,
  toIndex: number
) {
  return moveWorkspaceCard(torId, toColumn, toIndex)
}

export async function searchTorsForWorkspaceAction(keyword = "") {
  return searchTorsForWorkspace(keyword)
}

export async function addTorToWorkspaceAction(
  torId: string,
  column: WorkspaceColumnId
) {
  return addTorToWorkspace(torId, column)
}

export async function removeWorkspaceCardAction(torId: string, cardId?: string) {
  return removeWorkspaceCard(torId, cardId)
}

export async function updateWorkspaceCardAction(
  cardId: string,
  updates: Partial<Pick<WorkspaceCard, "priority" | "column" | "assigneeIds" | "checklist">>
) {
  return updateWorkspaceCard(cardId, updates)
}

export async function bookmarkTorAction(torId: string, bookmarked: boolean) {
  return bookmarkTor(torId, bookmarked)
}
