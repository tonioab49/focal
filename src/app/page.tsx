import { KanbanBoard } from "@/components/KanbanBoard";
import { loadTasks } from "@/lib";
import { getSelectedRepo, getRepoList } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const repos = await getRepoList();
  const selectedRepo = await getSelectedRepo();
  const activeRepo = selectedRepo && repos.includes(selectedRepo) ? selectedRepo : repos[0];

  const tasks = loadTasks(activeRepo);

  return (
    <div className="h-full p-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </p>
        </div>
        <p className="text-xs text-gray-400 flex items-center gap-1">
          Press <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">?</kbd> for shortcuts
        </p>
      </div>
      <KanbanBoard tasks={tasks} />
    </div>
  );
}
