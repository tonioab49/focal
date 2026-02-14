import { useEffect, useMemo, useRef, useState } from 'react'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'

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

interface UseCollaborationOptions {
  onSaveBroadcast?: () => void
}

export function useCollaboration(roomName: string, options?: UseCollaborationOptions) {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const [connectedUsers, setConnectedUsers] = useState<{ name: string; color: string }[]>([])
  const user = useMemo(() => getOrCreateUser(), [])

  const wsUrl = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL || 'ws://localhost:1236'

  // Provider + Y.Doc lifecycle
  useEffect(() => {
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    const p = new HocuspocusProvider({
      url: wsUrl,
      name: roomName,
      document: ydoc,
    })
    setProvider(p)

    return () => {
      p.destroy()
      ydoc.destroy()
      ydocRef.current = null
      setProvider(null)
    }
  }, [roomName, wsUrl])

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
  const onSaveBroadcastRef = useRef(options?.onSaveBroadcast)
  onSaveBroadcastRef.current = options?.onSaveBroadcast

  useEffect(() => {
    if (!provider) return

    const handler = ({ payload }: { payload: string }) => {
      try {
        const msg = JSON.parse(payload)
        if (msg.type === 'doc:saved') {
          onSaveBroadcastRef.current?.()
        }
      } catch { /* ignore malformed messages */ }
    }

    provider.on('stateless', handler)
    return () => {
      provider.off('stateless', handler)
    }
  }, [provider])

  const broadcastSave = useMemo(() => {
    return () => {
      provider?.sendStateless(JSON.stringify({ type: 'doc:saved' }))
    }
  }, [provider])

  return {
    provider,
    ydoc: ydocRef.current,
    ydocRef,
    connectedUsers,
    user,
    broadcastSave,
  }
}
