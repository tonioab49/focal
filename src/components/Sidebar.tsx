'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GitStatusIndicator } from './GitStatusIndicator'
import { RepoSelector } from './RepoSelector'
import type { DocNode } from '@/lib/docs'
import type { GitStatus } from '@/app/actions'

const NAV_ITEMS = [{ href: '/', label: 'Tasks', icon: '◫' }]

export function Sidebar({
  open,
  onClose,
  docTree,
  gitStatus,
  repos,
  selectedRepo,
}: {
  open: boolean
  onClose: () => void
  docTree: DocNode[]
  gitStatus: GitStatus
  repos: string[]
  selectedRepo: string
}) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-64 transform border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
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
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/' || pathname.startsWith('/task')
                  : pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="px-3 text-xs font-medium uppercase tracking-wide text-gray-400">
              Documentation
            </h3>
            {docTree.length === 0 ? (
              <p className="mt-2 px-3 text-xs text-gray-400 italic">
                No docs found
              </p>
            ) : (
              <ul className="mt-2 space-y-0.5">
                <DocTreeItems
                  nodes={docTree}
                  pathname={pathname}
                  onClose={onClose}
                  depth={0}
                />
              </ul>
            )}
          </div>
        </nav>
      </aside>
    </>
  )
}

function DocTreeItems({
  nodes,
  pathname,
  onClose,
  depth,
}: {
  nodes: DocNode[]
  pathname: string
  onClose: () => void
  depth: number
}) {
  return (
    <>
      {nodes.map((node) => {
        const href = `/docs/${node.slug}`
        const isActive = pathname === href
        const hasChildren = node.children && node.children.length > 0

        return (
          <li key={node.slug}>
            {hasChildren ? (
              <div>
                <span
                  className="block px-3 py-1.5 text-xs font-medium text-gray-500"
                  style={{ paddingLeft: `${12 + depth * 12}px` }}
                >
                  {node.title}
                </span>
                <ul className="space-y-0.5">
                  <DocTreeItems
                    nodes={node.children!}
                    pathname={pathname}
                    onClose={onClose}
                    depth={depth + 1}
                  />
                </ul>
              </div>
            ) : (
              <Link
                href={href}
                onClick={onClose}
                className={`block rounded-md py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                style={{ paddingLeft: `${12 + depth * 12}px` }}
              >
                {node.title}
              </Link>
            )}
          </li>
        )
      })}
    </>
  )
}
