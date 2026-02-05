import { KanbanBoard } from '@/components/KanbanBoard'
import { CommitBar } from '@/components/CommitBar'
import { loadTasks } from '@/lib'
import { getUncommittedFiles } from './actions'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const tasks = loadTasks()
  const dirtyFiles = await getUncommittedFiles()

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Focal</h1>
          <p className="mt-1 text-sm text-gray-500">
            {tasks.length} tasks across{' '}
            {new Set(tasks.map((t) => t.repository)).size} repositories
          </p>
        </div>
        <p className="text-xs text-gray-400 flex items-center gap-1">
          Press{' '}
          <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
            ?
          </kbd>{' '}
          for shortcuts
        </p>
      </div>
      <KanbanBoard tasks={tasks} />
      {dirtyFiles.length > 0 && (
        <div className="mt-8">
          <CommitBar dirtyFiles={dirtyFiles} />
        </div>
      )}
    </main>
  )
}
