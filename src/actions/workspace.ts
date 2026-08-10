"use server";

import {
  getWorkspaceBoard,
  listWorkspaceAssignees,
  moveWorkspaceCard,
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
