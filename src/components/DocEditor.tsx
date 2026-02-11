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

  const addLink = useCallback(() => {
    const url = window.prompt('URL')
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

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
        <div className="mb-3 flex flex-wrap items-center gap-0.5 border-b border-gray-200 pb-3">
          {/* Undo / Redo */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            title="Undo"
          >
            <IconUndo />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            title="Redo"
          >
            <IconRedo />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Headings */}
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor?.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor?.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={editor?.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            H3
          </ToolbarButton>

          <ToolbarDivider />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive('bulletList')}
            title="Bullet List"
          >
            <IconBulletList />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive('orderedList')}
            title="Numbered List"
          >
            <IconOrderedList />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            active={editor?.isActive('blockquote')}
            title="Blockquote"
          >
            <IconBlockquote />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Text formatting */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold')}
            title="Bold"
          >
            <IconBold />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic')}
            title="Italic"
          >
            <IconItalic />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            active={editor?.isActive('strike')}
            title="Strikethrough"
          >
            <IconStrike />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            active={editor?.isActive('underline')}
            title="Underline"
          >
            <IconUnderline />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleCode().run()}
            active={editor?.isActive('code')}
            title="Inline Code"
          >
            <IconCode />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Link */}
          <ToolbarButton
            onClick={addLink}
            active={editor?.isActive('link')}
            title="Add Link"
          >
            <IconLink />
          </ToolbarButton>
          {editor?.isActive('link') && (
            <ToolbarButton
              onClick={() => editor?.chain().focus().unsetLink().run()}
              title="Remove Link"
            >
              <IconUnlink />
            </ToolbarButton>
          )}

          <ToolbarDivider />

          {/* Code block */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            active={editor?.isActive('codeBlock')}
            title="Code Block"
          >
            <IconCodeBlock />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Text alignment */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            active={editor?.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            <IconAlignLeft />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            active={editor?.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            <IconAlignCenter />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            active={editor?.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            <IconAlignRight />
          </ToolbarButton>
        </div>
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

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded p-1.5 text-sm font-medium transition-colors disabled:opacity-30 ${
        active
          ? 'bg-gray-200 text-gray-900'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-gray-200" />
}

// Icons
function IconUndo() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M3 10h10a5 5 0 0 1 5 5v2M3 10l4-4M3 10l4 4" />
    </svg>
  )
}

function IconRedo() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M21 10H11a5 5 0 0 0-5 5v2M21 10l-4-4M21 10l-4 4" />
    </svg>
  )
}

function IconBold() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6V4zm0 8h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6v-8z"
        stroke="currentColor"
        strokeWidth={2}
        fill="none"
      />
    </svg>
  )
}

function IconItalic() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  )
}

function IconStrike() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="4" y1="12" x2="20" y2="12" />
      <path d="M17.5 7.5c-1.5-2-4-2.5-6-2-2.5.6-4 2.5-4 4.5 0 3 3 4 6 4.5s5 1.5 5 4c0 2.5-2.5 4.5-6 4.5-3 0-5.5-1.5-6.5-4" />
    </svg>
  )
}

function IconUnderline() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </svg>
  )
}

function IconCode() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function IconLink() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function IconUnlink() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M5.16 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.72-1.71" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}

function IconBulletList() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  )
}

function IconOrderedList() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <text x="3" y="7" fontSize="6" fill="currentColor" stroke="none">
        1
      </text>
      <text x="3" y="13" fontSize="6" fill="currentColor" stroke="none">
        2
      </text>
      <text x="3" y="19" fontSize="6" fill="currentColor" stroke="none">
        3
      </text>
    </svg>
  )
}

function IconBlockquote() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
    </svg>
  )
}

function IconCodeBlock() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <polyline points="8 10 6 12 8 14" />
      <polyline points="16 10 18 12 16 14" />
      <line x1="12" y1="8" x2="12" y2="16" />
    </svg>
  )
}

function IconAlignLeft() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="15" y2="12" />
      <line x1="3" y1="18" x2="18" y2="18" />
    </svg>
  )
}

function IconAlignCenter() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="5" y1="18" x2="19" y2="18" />
    </svg>
  )
}

function IconAlignRight() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="6" y1="18" x2="21" y2="18" />
    </svg>
  )
}
