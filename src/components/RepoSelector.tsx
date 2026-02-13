'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { setSelectedRepo } from '@/app/actions'

export function RepoSelector({
  repos,
  selectedRepo,
  localMode,
}: {
  repos: string[]
  selectedRepo: string
  localMode: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (localMode || repos.length <= 1) {
    return (
      <span className="text-xs text-gray-500">
        {localMode ? 'local' : selectedRepo}
      </span>
    )
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const repo = e.target.value
    startTransition(async () => {
      await setSelectedRepo(repo)
      router.refresh()
    })
  }

  return (
    <select
      value={selectedRepo}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
    >
      {repos.map((repo) => (
        <option key={repo} value={repo}>
          {repo}
        </option>
      ))}
    </select>
  )
}
