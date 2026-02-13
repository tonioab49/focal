'use client'

import { useState, useTransition, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { commitChanges } from '@/app/actions'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcut'
import type { GitStatus } from '@/app/actions'

export function GitStatusIndicator({ gitStatus, selectedRepo }: { gitStatus: GitStatus; selectedRepo?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  const fileCount = gitStatus.files.length
  const hasDirty = fileCount > 0

  // Reset result when modal closes
  useEffect(() => {
    if (!open) setResult(null)
  }, [open])

  const handleCommit = useCallback(() => {
    if (isPending || gitStatus.localMode) return
    startTransition(async () => {
      const res = await commitChanges(selectedRepo)
      setResult(res.message)
      router.refresh()
    })
  }, [isPending, gitStatus.localMode, selectedRepo, router])

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: 'Enter', ctrl: true, handler: handleCommit, global: true }],
      [handleCommit],
    ),
  )

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      <button
        onClick={() => hasDirty && setOpen(true)}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
          hasDirty
            ? 'text-amber-700 hover:bg-amber-50 cursor-pointer'
            : 'text-gray-400 cursor-default'
        }`}
        title={hasDirty ? `${fileCount} uncommitted` : 'No changes to commit'}
      >
        <span
          className={`h-2 w-2 rounded-full ${hasDirty ? 'bg-amber-500' : 'bg-gray-300'}`}
        />
        <span>
          {hasDirty ? `${fileCount} uncommitted` : 'No changes'}
        </span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative rounded-lg border border-gray-200 bg-white shadow-xl w-full max-w-md mx-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Uncommitted changes
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                Esc
              </button>
            </div>

            <ul className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {gitStatus.files.map((f) => (
                <li
                  key={f.path}
                  className="flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">{f.title}</p>
                    <p className="text-xs text-gray-400 truncate">{f.path}</p>
                  </div>
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      f.status === 'new'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {f.status}
                  </span>
                </li>
              ))}
            </ul>

            {result && (
              <p className="mb-3 text-sm text-gray-700">{result}</p>
            )}

            {gitStatus.localMode ? (
              <p className="text-xs text-gray-500 italic">
                In local mode, commit from your terminal to avoid conflicts with
                your working tree.
              </p>
            ) : (
              <button
                onClick={handleCommit}
                disabled={isPending || !!result}
                className="w-full rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {isPending ? (
                  'Committing...'
                ) : result ? (
                  result
                ) : (
                  <>
                    Commit & Push
                    <kbd className="rounded border border-amber-400 bg-amber-500 px-1 py-0.5 font-mono text-[10px] text-amber-100">
                      ^&#x21B5;
                    </kbd>
                  </>
                )}
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
