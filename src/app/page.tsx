import { KanbanBoard } from "@/components/KanbanBoard";
import { BoardHeader } from "@/components/BoardHeader";
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
      <BoardHeader taskCount={tasks.length} repoName={activeRepo} />
      <KanbanBoard tasks={tasks} />
    </div>
  );
}
