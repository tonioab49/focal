"use client";

import { useState, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { GitStatusIndicator } from "./GitStatusIndicator";
import { RepoSelector } from "./RepoSelector";
import { NewItemModal } from "./NewItemModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcut";
import type { DocNode } from "@/lib/docs";
import type { GitStatus } from "@/app/actions";

export function AppShell({
  children,
  docTree,
  gitStatus,
  repos,
  selectedRepo,
}: {
  children: React.ReactNode;
  docTree: DocNode[];
  gitStatus: GitStatus;
  repos: string[];
  selectedRepo: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newModalType, setNewModalType] = useState<"task" | "doc" | null>(null);
  const pathname = usePathname();

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const openNewModal = useCallback(() => {
    setNewModalType(pathname.startsWith("/docs") ? "doc" : "task");
  }, [pathname]);

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: "[", handler: toggleSidebar },
        { key: "n", handler: openNewModal },
      ],
      [toggleSidebar, openNewModal],
    ),
  );

  const onNewTask = useCallback(() => setNewModalType("task"), []);
  const onNewDoc = useCallback(() => setNewModalType("doc"), []);
  const closeModal = useCallback(() => setNewModalType(null), []);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        docTree={docTree}
        gitStatus={gitStatus}
        repos={repos}
        selectedRepo={selectedRepo}
        onNewTask={onNewTask}
        onNewDoc={onNewDoc}
      />

      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b border-gray-200 px-4 md:hidden">
          <button onClick={toggleSidebar} className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900" aria-label="Toggle sidebar">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="ml-3 flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">Focal</span>
            {repos.length > 1 && <RepoSelector repos={repos} selectedRepo={selectedRepo} localMode={gitStatus.localMode} />}
          </div>
          <div className="ml-auto">
            <GitStatusIndicator gitStatus={gitStatus} selectedRepo={selectedRepo} />
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {newModalType !== null && <NewItemModal type={newModalType} repoName={selectedRepo} onClose={closeModal} />}
    </div>
  );
}
