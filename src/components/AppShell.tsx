'use client'

import { useState, useMemo, useCallback } from 'react'
import { Sidebar } from './Sidebar'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcut'
import type { DocNode } from '@/lib/docs'

export function AppShell({
  children,
  docTree,
}: {
  children: React.ReactNode
  docTree: DocNode[]
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  useKeyboardShortcuts(
    useMemo(() => [{ key: '[', handler: toggleSidebar }], [toggleSidebar]),
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} docTree={docTree} />

      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b border-gray-200 px-4 md:hidden">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Toggle sidebar"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="ml-3 text-lg font-semibold text-gray-900">
            Focal
          </span>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
