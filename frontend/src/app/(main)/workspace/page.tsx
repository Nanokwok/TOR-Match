import { WorkspaceView } from "@/components/workspace/workspace-view";
import { getWorkspaceBoard } from "@/server/services/workspace.service";

export default async function WorkspacePage() {
  const board = await getWorkspaceBoard();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceView initialBoard={board} />
    </div>
  );
}
