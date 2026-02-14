import { loadTasks } from "@/lib";
import { notFound } from "next/navigation";
import { TaskEditForm } from "./TaskEditForm";

export const dynamic = "force-dynamic";

export default function TaskEditPage({ params }: { params: { id: string[] } }) {
  const taskId = params.id.join("/");
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === taskId);

  if (!task) notFound();

  return (
    <div className="h-full p-6">
      <div className="mx-auto max-w-[750px]">
        <TaskEditForm task={task} />
      </div>
    </div>
  );
}
