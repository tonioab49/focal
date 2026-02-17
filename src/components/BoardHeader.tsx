"use client";

import { useState } from "react";
import { NewItemModal } from "./NewItemModal";

type Props = {
  taskCount: number;
  repoName: string;
};

export function BoardHeader({ taskCount, repoName }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold text-gray-900">Tasks</h1>
            <button
              onClick={() => setShowModal(true)}
              className="rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-500 hover:border-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
            >
              New
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </p>
        </div>
        <p className="text-xs text-gray-400 flex items-center gap-1">
          Press <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">?</kbd> for shortcuts
        </p>
      </div>

      {showModal && <NewItemModal type="task" repoName={repoName} onClose={() => setShowModal(false)} />}
    </>
  );
}
