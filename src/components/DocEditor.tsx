'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { turndown } from '@/lib/turndown'
import { getBaseExtensions } from '@/lib/editorExtensions'
import { useEditorLinkClick } from '@/hooks/useEditorLinkClick'
import { useCollaboration } from '@/hooks/useCollaboration'
import { saveDoc } from '@/app/actions'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcut'
import { EditorToolbar } from '@/components/EditorToolbar'

interface DocEditorProps {
  filePath: string
  content: string
  title: string
  slug: string
}

export function DocEditor({ filePath, content, title, slug }: DocEditorProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const { provider, ydocRef, connectedUsers, user, broadcastSave } =
    useCollaboration(filePath, {
      onSaveBroadcast: () => setHasChanges(false),
    })

  const handleEditorLinkClick = useEditorLinkClick()

  // Build extensions — null until provider is ready
  const extensions = useMemo(() => {
    if (!provider || !ydocRef.current) return null
    return [
      ...getBaseExtensions({ collaboration: true }),
      Collaboration.configure({ document: ydocRef.current }),
      CollaborationCaret.configure({ provider, user }),
    ]
  }, [provider, user, ydocRef])

  const editor = useEditor(
    {
      extensions: extensions ?? getBaseExtensions(),
      editable: true,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px]',
        },
      },
      onUpdate: ({ transaction }) => {
        if (transaction.getMeta('y-sync$')) return
        setHasChanges(true)
      },
    },
    [extensions],
  )

  const handleSave = useCallback(async () => {
    if (!editor || !provider || isSaving || !hasChanges) return

    setIsSaving(true)
    try {
      const html = editor.getHTML()
      const markdown = turndown.turndown(html)
      await saveDoc({ filePath, content: markdown })
      setHasChanges(false)
      broadcastSave()
      router.refresh()
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }, [editor, filePath, isSaving, hasChanges, router, provider, broadcastSave])

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: 's', meta: true, handler: handleSave, global: true }],
      [handleSave],
    ),
  )

  return (
    <div className="mx-auto max-w-[750px]">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <div className="flex items-center gap-3">
          {/* Connected users */}
          {connectedUsers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {connectedUsers.slice(0, 5).map((u, i) => (
                  <div
                    key={i}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white"
                    style={{ backgroundColor: u.color }}
                    title={u.name}
                  >
                    {u.name.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasChanges && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Unsaved changes</span>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {editor && (
        <EditorToolbar
          editor={editor}
          className="mb-3 border-b border-gray-200 pb-3"
        />
      )}

      <div onClickCapture={handleEditorLinkClick}>
        <EditorContent editor={editor} />
      </div>

      {hasChanges && (
        <p className="mt-2 text-xs text-gray-400">
          <kbd className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 font-mono text-[10px]">
            ⌘S
          </kbd>{' '}
          to save
        </p>
      )}
    </div>
  )
}
