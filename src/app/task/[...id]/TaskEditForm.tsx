'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { marked } from 'marked'
import TurndownService from 'turndown'
import type { Task, TaskStatus, TaskPriority } from '@/types'
import { saveTask } from '@/app/actions'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcut'
import { EditorToolbar } from '@/components/EditorToolbar'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
})

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const PRIORITIES: { value: TaskPriority | ''; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function TaskEditForm({ task }: { task: Task }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(task.title)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<TaskPriority | ''>(
    task.priority ?? '',
  )
  const [assignee, setAssignee] = useState(task.assignee ?? '')
  const [error, setError] = useState<string | null>(null)
  const [hasBodyChanges, setHasBodyChanges] = useState(false)

  const htmlContent = useMemo(() => {
    return marked.parse(task.body || '', { async: false }) as string
  }, [task.body])

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: htmlContent,
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px]',
      },
    },
    onUpdate: () => {
      setHasBodyChanges(true)
    },
  })

  const handleSave = useCallback(() => {
    setError(null)
    startTransition(async () => {
      try {
        let body: string | undefined
        if (editor && hasBodyChanges) {
          const html = editor.getHTML()
          body = turndown.turndown(html)
        }
        await saveTask({
          filePath: task.filePath,
          title,
          status,
          priority,
          assignee,
          body,
        })
        setHasBodyChanges(false)
        router.push('/')
      } catch {
        setError('Failed to save task')
      }
    })
  }, [task.filePath, title, status, priority, assignee, editor, hasBodyChanges, router])

  const handleBack = useCallback(() => {
    router.push('/')
  }, [router])

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: 's', meta: true, handler: handleSave, global: true },
        { key: 'Escape', handler: handleBack, global: true },
      ],
      [handleSave, handleBack],
    ),
  )

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          &larr; Back
        </Link>
        <span className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
            Esc
          </kbd>
          <span>back</span>
          <kbd className="ml-2 rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
            &#8984;S
          </kbd>
          <span>save</span>
        </span>
      </div>

      <div className="space-y-5">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="priority"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority | '')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="assignee"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Assignee
          </label>
          <input
            id="assignee"
            type="text"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="e.g. alice@example.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>

          {editor && (
            <EditorToolbar
              editor={editor}
              className="mb-0 rounded-t-md border border-b-0 border-gray-300 bg-gray-50 px-2 py-1.5"
            />
          )}

          <div className="rounded-b-md border border-gray-300 px-3 py-2">
            <EditorContent editor={editor} />
          </div>
        </div>

        <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
          <span className="text-xs font-medium text-gray-500">File</span>
          <p className="text-sm text-gray-700 font-mono mt-0.5 break-all">
            {task.filePath}
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <Link
            href="/"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}

