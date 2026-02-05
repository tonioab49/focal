'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { commitChanges } from '@/app/actions'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcut'

export function CommitBar({ dirtyFiles }: { dirtyFiles: string[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  const handleCommit = useCallback(() => {
    if (isPending || result) return
    setResult(null)
    startTransition(async () => {
      const res = await commitChanges()
      setResult(res.message)
      router.refresh()
    })
  }, [isPending, result, router])

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: 'Enter', ctrl: true, handler: handleCommit, global: true }],
      [handleCommit],
    ),
  )

  if (dirtyFiles.length === 0 && !result) return null

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
        <p className="text-sm text-amber-800 truncate">
          {result ??
            `${dirtyFiles.length} uncommitted ${dirtyFiles.length === 1 ? 'file' : 'files'} in task folders`}
        </p>
      </div>
      {!result && (
        <button
          onClick={handleCommit}
          disabled={isPending}
          className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          {isPending ? (
            'Committing...'
          ) : (
            <>
              Commit changes
              <kbd className="rounded border border-amber-400 bg-amber-500 px-1 py-0.5 font-mono text-[10px] text-amber-100">
                ^&crarr;
              </kbd>
            </>
          )}
        </button>
      )}
    </div>
  )
}
