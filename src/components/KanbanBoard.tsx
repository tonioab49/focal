"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Task, TaskStatus } from "@/types";
import { TaskCard } from "./TaskCard";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcut";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in-progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const router = useRouter();

  // Group tasks by column
  const columns = useMemo(() => COLUMNS.map((col) => tasks.filter((t) => t.status === col.status)), [tasks]);

  // Selection: [columnIndex, rowIndex], null = nothing selected
  const [sel, setSel] = useState<[number, number] | null>(null);

  const selectedTask = sel && columns[sel[0]] && columns[sel[0]][sel[1]] ? columns[sel[0]][sel[1]] : null;

  const move = useCallback(
    (dc: number, dr: number) => {
      setSel((prev) => {
        if (!prev) {
          // First selection: pick the first task in the first non-empty column
          for (let c = 0; c < columns.length; c++) {
            if (columns[c].length > 0) return [c, 0];
          }
          return null;
        }

        let [c, r] = prev;

        if (dc !== 0) {
          // Move between columns
          let nc = c + dc;
          // Wrap around
          if (nc < 0) nc = columns.length - 1;
          if (nc >= columns.length) nc = 0;

          // Find a non-empty column in the direction
          let attempts = 0;
          while (columns[nc].length === 0 && attempts < columns.length) {
            nc = nc + dc;
            if (nc < 0) nc = columns.length - 1;
            if (nc >= columns.length) nc = 0;
            attempts++;
          }
          if (columns[nc].length === 0) return prev;

          return [nc, Math.min(r, columns[nc].length - 1)];
        }

        if (dr !== 0) {
          const len = columns[c].length;
          if (len === 0) return prev;
          let nr = r + dr;
          // Clamp
          if (nr < 0) nr = 0;
          if (nr >= len) nr = len - 1;
          return [c, nr];
        }

        return prev;
      });
    },
    [columns],
  );

  const openSelected = useCallback(() => {
    if (selectedTask) {
      router.push(`/task/${selectedTask.id}`);
    }
  }, [selectedTask, router]);

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: "j", handler: () => move(0, 1) },
        { key: "k", handler: () => move(0, -1) },
        { key: "h", handler: () => move(-1, 0) },
        { key: "l", handler: () => move(1, 0) },
        { key: "ArrowDown", handler: () => move(0, 1) },
        { key: "ArrowUp", handler: () => move(0, -1) },
        { key: "ArrowLeft", handler: () => move(-1, 0) },
        { key: "ArrowRight", handler: () => move(1, 0) },
        { key: "Enter", handler: openSelected },
        {
          key: "Escape",
          handler: () => setSel(null),
        },
      ],
      [move, openSelected],
    ),
  );

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:max-w-[1548px]">
      {COLUMNS.map((col, ci) => {
        const columnTasks = columns[ci];
        return (
          <div key={col.status} className="flex flex-col gap-3 md:max-w-[500px]">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-700">{col.label}</h2>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">{columnTasks.length}</span>
            </div>
            <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-3 min-h-[120px]">
              {columnTasks.map((task, ri) => (
                <TaskCard key={task.filePath} task={task} selected={sel !== null && sel[0] === ci && sel[1] === ri} />
              ))}
              {columnTasks.length === 0 && <p className="text-center text-xs text-gray-400 py-6">No tasks</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
