# Goal

Extract shared editor code and add Hocuspocus collaboration to TaskEditForm.

# Context / assumptions

- DocEditor and TaskEditForm had identical tiptap setup (extensions, turndown, link-click handler)
- Hocuspocus collab server already running for docs; task editor was non-collaborative
- Task collab room names use `task:` prefix to avoid collisions with doc rooms

# Decisions made

- Extracted 4 shared modules: `src/lib/turndown.ts`, `src/lib/editorExtensions.ts`, `src/hooks/useEditorLinkClick.ts`, `src/hooks/useCollaboration.ts`
- `getBaseExtensions({ collaboration: true })` disables StarterKit undo/redo for collab mode
- `useCollaboration` hook exposes `ydocRef` (ref) instead of `ydoc` (value) to avoid stale closure issues
- Removed `marked` dependency from TaskEditForm — content is now Y.Doc-driven via collaboration
- `onSaveBroadcast` callback passed via options to keep hook generic
- `broadcastSave` is a stable function via `useMemo` keyed on provider

# Artifacts

- `src/lib/turndown.ts` — new shared TurndownService instance
- `src/lib/editorExtensions.ts` — new `getBaseExtensions()` factory
- `src/hooks/useEditorLinkClick.ts` — new shared link-click hook
- `src/hooks/useCollaboration.ts` — new collaboration hook (provider, awareness, broadcast)
- `src/components/DocEditor.tsx` — refactored to use shared modules
- `src/app/task/[...id]/TaskEditForm.tsx` — refactored + collab added

# If we resume

- Run `yarn dev` and test doc editing in two windows — verify cursors/save broadcast still work
- Open a task in two windows — verify collab cursors appear and body edits sync
- Verify "Unsaved changes" does NOT appear on first load (y-sync$ guard)
- The Hocuspocus server may need a handler for `task:*` room names if it filters by prefix
