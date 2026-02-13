'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'
import TurndownService from 'turndown'
import { saveDoc } from '@/app/actions'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcut'
import { EditorToolbar } from '@/components/EditorToolbar'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
})

// --- Random username generation ---

const ADJECTIVES = [
  'Red', 'Blue', 'Green', 'Purple', 'Golden', 'Silver', 'Coral',
  'Amber', 'Jade', 'Ivory', 'Crimson', 'Azure', 'Teal', 'Violet',
]
const ANIMALS = [
  'Fox', 'Panda', 'Owl', 'Wolf', 'Falcon', 'Otter', 'Lynx',
  'Heron', 'Raven', 'Tiger', 'Bear', 'Hawk', 'Deer', 'Crane',
]
const COLORS = [
  '#e06c75', '#61afef', '#98c379', '#c678dd', '#e5c07b',
  '#56b6c2', '#be5046', '#d19a66', '#7ec8e3', '#c3a6ff',
]

function getOrCreateUser(): { name: string; color: string } {
  if (typeof window === 'undefined') {
    return { name: 'Anonymous', color: COLORS[0] }
  }
  const stored = sessionStorage.getItem('focal-collab-user')
  if (stored) {
    try { return JSON.parse(stored) } catch { /* regenerate */ }
  }
  const name = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${ANIMALS[Math.floor(Math.random() * ANIMALS.length)]}`
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  const user = { name, color }
  sessionStorage.setItem('focal-collab-user', JSON.stringify(user))
  return user
}

// --- Component ---

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
  const [connectedUsers, setConnectedUsers] = useState<
    { name: string; color: string }[]
  >([])
  const user = useMemo(() => getOrCreateUser(), [])

  const wsUrl =
    process.env.NEXT_PUBLIC_HOCUSPOCUS_URL || 'ws://localhost:1236'

  // Provider + Y.Doc created inside useEffect to survive React Strict Mode.
  // Strict Mode unmounts/remounts effects — useMemo values are NOT recreated,
  // so a provider created in useMemo gets .destroy()'d on the first cleanup
  // and the second mount reuses the dead instance.
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)

  useEffect(() => {
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    const p = new HocuspocusProvider({
      url: wsUrl,
      name: filePath,
      document: ydoc,
    })
    setProvider(p)

    return () => {
      p.destroy()
      ydoc.destroy()
      ydocRef.current = null
      setProvider(null)
    }
  }, [filePath, wsUrl])

  // Track connected users via awareness
  useEffect(() => {
    if (!provider) return
    const awareness = provider.awareness
    if (!awareness) return

    awareness.setLocalStateField('user', user)

    const updateUsers = () => {
      const states = awareness.getStates()
      const users: { name: string; color: string }[] = []
      states.forEach((state) => {
        if (state.user) {
          users.push(state.user)
        }
      })
      setConnectedUsers(users)
    }

    awareness.on('change', updateUsers)
    updateUsers()

    return () => {
      awareness.off('change', updateUsers)
    }
  }, [provider, user])

  // Listen for stateless save broadcasts
  useEffect(() => {
    if (!provider) return

    const handler = ({ payload }: { payload: string }) => {
      try {
        const msg = JSON.parse(payload)
        if (msg.type === 'doc:saved') {
          setHasChanges(false)
        }
      } catch { /* ignore malformed messages */ }
    }

    provider.on('stateless', handler)
    return () => {
      provider.off('stateless', handler)
    }
  }, [provider])

  // Build extensions — null until provider is ready
  const extensions = useMemo(() => {
    if (!provider || !ydocRef.current) return null
    return [
      StarterKit.configure({ undoRedo: false }),
      Link.configure({ openOnClick: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Collaboration.configure({ document: ydocRef.current }),
      CollaborationCaret.configure({ provider, user }),
    ]
  }, [provider, user])

  const editor = useEditor(
    {
      extensions: extensions ?? [StarterKit],
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
    },
    // Recreate editor when extensions change (i.e. when provider becomes available)
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
      provider.sendStateless(JSON.stringify({ type: 'doc:saved' }))
      router.refresh()
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }, [editor, filePath, isSaving, hasChanges, router, provider])

  const handleEditorLinkClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return

      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }

      if (url.origin !== window.location.origin) return

      event.preventDefault()
      router.push(`${url.pathname}${url.search}${url.hash}`)
    },
    [router],
  )

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
              <span className="text-xs text-gray-400">
                {connectedUsers.length}
              </span>
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
