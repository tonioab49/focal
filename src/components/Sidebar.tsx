"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitStatusIndicator } from "./GitStatusIndicator";
import { RepoSelector } from "./RepoSelector";
import type { DocNode } from "@/lib/docs";
import type { GitStatus } from "@/app/actions";

export function Sidebar({
  open,
  onClose,
  docTree,
  gitStatus,
  repos,
  selectedRepo,
  onNewTask,
  onNewDoc,
}: {
  open: boolean;
  onClose: () => void;
  docTree: DocNode[];
  gitStatus: GitStatus;
  repos: string[];
  selectedRepo: string;
  onNewTask: () => void;
  onNewDoc: (parentDir?: string) => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-64 transform border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center border-b border-gray-200 px-4">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            Focal
          </Link>
          <div className="ml-auto">
            <RepoSelector repos={repos} selectedRepo={selectedRepo} localMode={gitStatus.localMode} />
          </div>
        </div>

        <div className="border-b border-gray-200 px-4 py-2">
          <GitStatusIndicator gitStatus={gitStatus} selectedRepo={selectedRepo} />
        </div>

        <nav className="h-[calc(100%-3.5rem-2.5rem)] overflow-y-auto p-3">
          <div>
            <div className="flex items-center justify-between px-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">Tasks</h3>
              <button
                onClick={onNewTask}
                className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 hover:border-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
              >
                New
              </button>
            </div>
            <ul className="mt-1 space-y-0.5">
              <li>
                <Link
                  href="/"
                  onClick={onClose}
                  className={`block rounded-md px-3 py-1 text-sm transition-colors ${
                    pathname === "/" || pathname.startsWith("/task")
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  Kanban View
                </Link>
              </li>
            </ul>
          </div>

          <div className="mt-4 border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between px-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">Documentation</h3>
              <button
                onClick={() => onNewDoc()}
                className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 hover:border-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
              >
                New
              </button>
            </div>
            {docTree.length === 0 ? (
              <p className="mt-1 px-3 text-xs text-gray-400 italic">No docs found</p>
            ) : (
              <ul className="mt-1 space-y-0">
                <DocTreeItems nodes={docTree} pathname={pathname} onClose={onClose} depth={0} onNewDoc={onNewDoc} />
              </ul>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}

function DocTreeItems({
  nodes,
  pathname,
  onClose,
  depth,
  onNewDoc,
}: {
  nodes: DocNode[];
  pathname: string;
  onClose: () => void;
  depth: number;
  onNewDoc: (parentDir?: string) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const href = `/docs/${node.slug}`;
        const isActive = pathname === href;
        const hasChildren = node.children && node.children.length > 0;
        const itemPaddingLeft = `${12 + depth * 10}px`;

        return (
          <li key={node.slug}>
            {hasChildren ? (
              <div className="group">
                <div className="flex items-center" style={{ paddingLeft: itemPaddingLeft }}>
                  <span className="flex-1 truncate rounded-md py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                    {node.title}
                  </span>
                  <button
                    onClick={() => onNewDoc(node.filePath)}
                    className="invisible group-hover:visible mr-1 rounded px-1 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    title="New doc here"
                  >
                    +
                  </button>
                </div>
                <ul className="space-y-0">
                  <DocTreeItems nodes={node.children!} pathname={pathname} onClose={onClose} depth={depth + 1} onNewDoc={onNewDoc} />
                </ul>
              </div>
            ) : (
              <Link
                href={href}
                onClick={onClose}
                className={`block truncate rounded-md py-1 text-sm transition-colors ${
                  isActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
                style={{ paddingLeft: itemPaddingLeft }}
              >
                {node.title}
              </Link>
            )}
          </li>
        );
      })}
    </>
  );
}
