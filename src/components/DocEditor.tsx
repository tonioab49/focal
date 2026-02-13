'use client'

import { useCallback, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { saveDoc } from '@/app/actions'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcut'
import { EditorToolbar } from '@/components/EditorToolbar'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
})

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
  const initialContent = useRef(content)

  const htmlContent = useMemo(() => {
    return marked.parse(content, { async: false }) as string
  }, [content])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
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
      setHasChanges(true)
    },
  })

  const handleSave = useCallback(async () => {
    if (!editor || isSaving || !hasChanges) return

    setIsSaving(true)
    try {
      const html = editor.getHTML()
      const markdown = turndown.turndown(html)
      await saveDoc({ filePath, content: markdown })
      setHasChanges(false)
      initialContent.current = markdown
      router.refresh()
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }, [editor, filePath, isSaving, hasChanges, router])

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

      {editor && (
        <EditorToolbar
          editor={editor}
          className="mb-3 border-b border-gray-200 pb-3"
        />
      )}

      <div>
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

