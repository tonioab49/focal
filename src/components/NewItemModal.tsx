"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcut";
import { createTask, createDoc } from "@/app/actions";

type Props = {
  type: "task" | "doc";
  repoName: string;
  onClose: () => void;
};

export function NewItemModal({ type, repoName, onClose }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleClose = useCallback(() => onClose(), [onClose]);

  useKeyboardShortcuts(useMemo(() => [{ key: "Escape", global: true, handler: handleClose }], [handleClose]));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || isPending) return;

    startTransition(async () => {
      if (type === "task") {
        const { taskId } = await createTask({ title: title.trim(), repoName });
        router.push(`/task/${taskId}`);
      } else {
        const { slug } = await createDoc({ title: title.trim(), repoName });
        router.push(`/docs/${slug}`);
      }
      onClose();
    });
  }

  const label = type === "task" ? "New task" : "New document";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative rounded-lg border border-gray-200 bg-white shadow-xl w-full max-w-md mx-4 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">{label}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            autoFocus
            disabled={isPending}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
