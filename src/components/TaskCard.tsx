import Link from "next/link";
import type { Task, TaskPriority } from "@/types";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function TaskCard({ task, selected }: { task: Task; selected?: boolean }) {
  return (
    <Link
      href={`/task/${task.id}`}
      className={`block rounded-lg border bg-white p-3 shadow-sm transition-all ${
        selected ? "border-blue-500 ring-2 ring-blue-500/20 shadow" : "border-gray-200 hover:border-blue-300 hover:shadow"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug text-gray-900">{task.title}</h3>
      </div>
      {task.priority && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>
      )}
      {task.assignee && <p className="mt-2 truncate text-xs text-gray-400">{task.assignee}</p>}
    </Link>
  );
}
