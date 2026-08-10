"use server";

import {
  addTorToWorkspace,
  getWorkspaceBoard,
  listWorkspaceAssignees,
  moveWorkspaceCard,
  removeWorkspaceCard,
  searchTorsForWorkspace,
} from "@/server/services/workspace.service";
import type { WorkspaceColumnId, WorkspaceQuery } from "@/types/workspace";

export async function getWorkspaceBoardAction(query: WorkspaceQuery = {}) {
  return getWorkspaceBoard(query);
}

export async function getWorkspaceAssigneesAction() {
  return listWorkspaceAssignees();
}

export async function moveWorkspaceCardAction(
  torId: string,
  toColumn: WorkspaceColumnId,
  toIndex: number,
) {
  return moveWorkspaceCard(torId, toColumn, toIndex);
}

export async function searchTorsForWorkspaceAction(keyword = "") {
  return searchTorsForWorkspace(keyword);
}

export async function addTorToWorkspaceAction(
  torId: string,
  column: WorkspaceColumnId,
) {
  return addTorToWorkspace(torId, column);
}

export async function removeWorkspaceCardAction(torId: string) {
  return removeWorkspaceCard(torId);
}
