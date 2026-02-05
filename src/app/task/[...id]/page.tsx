import { loadTasks } from '@/lib'
import { notFound } from 'next/navigation'
import { TaskEditForm } from './TaskEditForm'

export const dynamic = 'force-dynamic'

export default function TaskEditPage({ params }: { params: { id: string[] } }) {
  const taskId = params.id.join('/')
  const tasks = loadTasks()
  const task = tasks.find((t) => t.id === taskId)

  if (!task) notFound()

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <TaskEditForm task={task} />
    </main>
  )
}
