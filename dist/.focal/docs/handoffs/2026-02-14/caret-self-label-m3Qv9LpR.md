# Goal

- Update realtime collaboration identity display so each client keeps a random collaboration identity, but the current tab sees its own identity labeled as `Me`.
- Apply the behavior consistently in both document and task editors for caret labels and connected-user avatars.

# Context / assumptions

- Context reviewed from `.focal/docs/handoffs/2026-02-13/handoff-Vc3Tk8Qn.mdx` and `.focal/docs/realtime-collaboration.md` before implementation.
- Existing behavior: random `{name, color}` was generated per tab and stored in `sessionStorage`, then pushed via awareness.
- Existing UI used raw awareness `name` everywhere, so local user saw their random name in local tab.
- Requirement interpreted as: only local presentation should become `Me`; remote clients should continue seeing the random name.
- UNKNOWN: whether connected-users ordering should prioritize `Me` first.
- UNKNOWN: whether this `Me` behavior is desired in any future non-editor collaboration surfaces.

# Decisions made

- Added stable per-tab user `id` to collaboration identity in `useCollaboration` and persisted it in `sessionStorage`.
- Preserved backward compatibility for older stored identities that lacked `id` by migrating on read.
- Kept awareness payload as random identity (`name`, `color`, `id`) so other clients still receive random names.
- Mapped local awareness entry to `displayName: "Me"` only when rendering in the local tab.
- Implemented explicit `CollaborationCaret.render` in both editors and replaced caret label text with `Me` when `awarenessUser.id === localUser.id`.
- Updated connected-user avatar titles/initials in both editors to use `displayName` so local bubble reflects `Me` too.
- Did not change server or collaboration protocol beyond adding optional `id` on user payload.

# Artifacts

- Files changed:
- `src/hooks/useCollaboration.ts`
- `src/components/DocEditor.tsx`
- `src/app/task/[...id]/TaskEditForm.tsx`
- Validation run:
- `yarn format` (pass)
- `yarn lint` (pass)
- `yarn typecheck` (pass)
- Minimal diff summary:
- `useCollaboration`: introduced typed `CollaborationUser` with `id`; added `ConnectedUser.displayName`; self-detection maps local display to `Me`.
- `DocEditor` and `TaskEditForm`: customized collaboration caret renderer + switched avatar tooltip/initial source from `name` to `displayName`.

# If we resume

- Start by manually validating with two tabs on the same doc and same task page.
- Confirm local tab shows `Me` for its own label while remote tabs still show random names.
- Verify two different browsers still show independent random names to each other.
- If UX requests it, add explicit badge text (`Me`) near avatar row instead of relying on tooltip/initial only.
