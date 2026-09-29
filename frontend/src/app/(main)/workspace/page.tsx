import { WorkspaceView } from "@/components/workspace/workspace-view";
import { getWorkspaceBoard } from "@/server/services/workspace.service";

type WorkspacePageProps = {
  searchParams?: Promise<{ tor?: string; card?: string; tab?: string }>
}

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const [board, params] = await Promise.all([
    getWorkspaceBoard(),
    searchParams ?? Promise.resolve<{ tor?: string; card?: string; tab?: string }>({}),
  ])

  const initialTorId = params.tor ?? params.card ?? null
  const initialTab = params.tab === "checklist" ? "checklist" : "details"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceView
        initialBoard={board}
        initialTorId={initialTorId}
        initialTab={initialTab}
      />
    </div>
  )
}
