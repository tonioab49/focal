# Goal

Implement in-app task and document creation via keyboard shortcut (`N`) and `+` buttons.

# Context / assumptions

- Local mode (single git repo) was the primary target; multi-repo mode supported via `repoName` param
- Existing `saveTask`/`saveDoc` path validation patterns reused for new actions
- `useKeyboardShortcuts` already supports `global` flag to skip inputs — `N` uses non-global (default)

# Decisions made

- `AppShell` owns the `N` shortcut modal state; route-based: `/docs/*` → doc, else → task
- `BoardHeader` is an isolated client island managing its own modal state (avoids prop-drilling through server page)
- Collision-safe slugs: append `-2`, `-3`, etc.
- New tasks default to `status: todo`, no priority/assignee
- New docs start with empty body (`.md` extension)
- `N` shortcut key is lowercase `"n"` in code (keyboard event `.key` is lowercase when no shift)

# Artifacts

- **Created**: `src/components/NewItemModal.tsx`
- **Created**: `src/components/BoardHeader.tsx`
- **Modified**: `src/app/actions.ts` — added `createTask`, `createDoc`
- **Modified**: `src/app/page.tsx` — replaced inline header with `<BoardHeader>`
- **Modified**: `src/components/AppShell.tsx` — added `N` shortcut, modal state, callbacks to Sidebar
- **Modified**: `src/components/Sidebar.tsx` — added `onNewTask`/`onNewDoc` props, `+` buttons
- **Modified**: `src/components/ShortcutHelp.tsx` — added `N` entries to Board and Docs sections

# If we resume

- Run `yarn dev` and manually verify all 9 verification steps from the plan
- Consider adding error handling UI in `NewItemModal` (currently silently fails on server action error)
- Docs created as `.md` — verify doc loader picks them up (check `src/lib/docs.ts` if not)
