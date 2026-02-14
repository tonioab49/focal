# Realtime Collaboration for Doc Editor

## Overview

Add realtime collaborative editing to the DocEditor using Hocuspocus (open-source Yjs WebSocket server) and tiptap's Collaboration extensions. Multiple users can edit the same document simultaneously, see each other's cursors with username bubbles, and know when someone else saves.

## Architecture

```
┌──────────────┐     WebSocket      ┌───────────────────┐
│  Browser A   │◄──────────────────►│                   │
│  (DocEditor) │                    │  Hocuspocus       │
├──────────────┤     WebSocket      │  Server           │
│  Browser B   │◄──────────────────►│  (port 1236)      │
│  (DocEditor) │                    │  (dumb relay)     │
└──────────────┘                    └───────────────────┘
       │
       │  Server Action (saveDoc)
       ▼
┌──────────────┐
│  Next.js     │
│  Server      │
│  (port 3000) │
└──────────────┘
```

## Packages to Install

All free/open-source:

| Package                                 | Purpose                              |
| --------------------------------------- | ------------------------------------ |
| `@hocuspocus/server`                    | WebSocket collaboration server       |
| `@hocuspocus/provider`                  | Client-side WebSocket provider       |
| `@tiptap/extension-collaboration`       | Yjs ↔ Tiptap binding                 |
| `@tiptap/extension-collaboration-caret` | Display remote cursors               |
| `yjs`                                   | CRDT library (peer dep)              |
| `concurrently` (devDep)                 | Run Next.js + Hocuspocus in parallel |

Note: No server-side tiptap or `y-prosemirror` needed — the server is a dumb relay and initial content is handled client-side by tiptap's Collaboration extension.

## Components

### 1. Hocuspocus Server (`server/hocuspocus.ts`)

A minimal standalone Node.js file — acts as a **dumb relay** with no document loading logic:

- Listens on port `1236` (configurable via `HOCUSPOCUS_PORT` env var)
- No `onLoadDocument` hook needed — tiptap's Collaboration extension handles initial content client-side. When the first client connects, the Yjs document is empty, and tiptap populates it from the `content` prop (the SSR'd markdown→HTML). Subsequent clients receive the already-populated Yjs state.
- **`onStateless` hook**: Relays stateless messages (used for save broadcasts) to all connected clients on the same document.
- No tiptap extensions or schema needed on the server.
- Runs as a plain Node.js process (via `tsx` in dev, compiled JS in prod).

### 2. DocEditor Changes (`src/components/DocEditor.tsx`)

Major changes to integrate collaboration:

- **HocuspocusProvider**: Create a provider instance connected to `ws://localhost:1236` with the `filePath` as the document name.
- **Collaboration extension**: Replace the static `content` prop with Yjs-backed collaboration. Disable StarterKit's built-in undo/redo (`undoRedo: false`) since Collaboration provides its own Yjs-aware undo/redo.
- **CollaborationCaret extension**: Display remote cursors as colored bubbles with usernames. Configure with a random user identity (name + color).
- **Keep `content` prop**: It serves as initial content when the Yjs doc is empty (first connection). Remove the `initialContent` ref since Yjs is now the source of truth.
- **Random username**: Generate a fun random name (e.g., "Blue Fox", "Red Panda") on mount and store in `sessionStorage` so it persists across navigations. Assign a random color from a palette.
- **Connected users count**: Read the provider's awareness states to display how many users are connected. Show this in the editor header.
- **Save broadcast**: After a successful save, call `provider.sendStateless(JSON.stringify({ type: 'doc:saved' }))`. Listen for incoming stateless messages; when a `doc:saved` message arrives, set `hasChanges = false`.
- **Dirty state**: The `hasChanges` flag still works the same locally (set on `onUpdate`), but is cleared for all users when any user saves.
- **Cleanup**: Destroy the provider on component unmount.

### 3. Connected Users Display

In the DocEditor header area (next to the title), show:

- Small colored avatar bubbles (initials or first letter) for each connected user
- A count badge (e.g., "3 connected")
- Current user highlighted differently

### 4. Cursor Rendering (CollaborationCaret)

Custom `render` function for the caret extension:

- A colored vertical line at the caret position
- A small label bubble above showing the username
- Colors match the user's assigned color
- CSS styling via Tailwind or inline styles in globals.css

### 5. Script Changes (`package.json`)

```json
{
  "scripts": {
    "dev": "test -f .env.local && set -a && . ./.env.local && set +a; concurrently -k -n next,ws -c blue,green \"next dev\" \"tsx server/hocuspocus.ts\"",
    "dev:bare": "concurrently -k -n next,ws -c blue,green \"next dev\" \"tsx server/hocuspocus.ts\"",
    "build": "next build && tsc server/hocuspocus.ts --outDir .next/server-ws",
    "start": "concurrently -k \"next start\" \"node .next/server-ws/hocuspocus.js\""
  }
}
```

Key: `concurrently -k` ensures that when one process dies (or CTRL-C), it kills the other too.

### 6. Dockerfile Changes

The Docker build needs to also compile the hocuspocus server. The runner stage runs both processes using `concurrently` or a small wrapper script. Both processes share the same filesystem for reading/writing markdown files.

### 7. Environment Variables

| Variable                     | Default               | Description                   |
| ---------------------------- | --------------------- | ----------------------------- |
| `HOCUSPOCUS_PORT`            | `1236`                | Port for the WebSocket server |
| `NEXT_PUBLIC_HOCUSPOCUS_URL` | `ws://localhost:1236` | WebSocket URL for the client  |

`NEXT_PUBLIC_` prefix makes it available in client-side code.

## Save Flow (Updated)

1. User A makes edits → `hasChanges = true` locally (and for all users seeing Yjs updates)
2. User A presses ⌘S → `handleSave()` runs:
   a. Get HTML from editor → convert to Markdown via turndown
   b. Call `saveDoc` server action (writes to disk)
   c. Send stateless message `{ type: 'doc:saved' }` via provider
   d. Set `hasChanges = false` locally
3. All other clients receive the stateless message → set `hasChanges = false`

## Document Loading Flow

1. User navigates to `/docs/some-doc`
2. Next.js SSR renders the page, passes `filePath` and `content` (HTML) to DocEditor
3. DocEditor creates a HocuspocusProvider with `name = filePath`
4. Provider connects to the Hocuspocus server
5. If this is the first connection for this document:
   - Yjs doc is empty → tiptap's Collaboration extension initializes it from the `content` prop
   - Content is synced to the server and any future clients
6. If other users are already connected:
   - Client receives the existing Yjs state (already in memory on server)
   - The `content` prop is ignored since the Yjs doc is non-empty

## Dirty State Tracking

With collaboration, "dirty" means the Yjs document differs from what's on disk. We track this as:

- Any Yjs `onUpdate` that originates from a remote user also sets `hasChanges = true` (since the in-memory state now differs from disk)
- A save by ANY user clears `hasChanges` for ALL users (via stateless broadcast)

## What's NOT Included (Paid/Cloud Features)

- No Tiptap Cloud — we self-host Hocuspocus
- No authentication on the WebSocket (can be added later via `onAuthenticate` hook)
- No Redis scaling — single-server only
- No persistence extension — we use the filesystem directly
- No version history / snapshots

## Files to Create/Modify

| File                               | Action                            |
| ---------------------------------- | --------------------------------- |
| `server/hocuspocus.ts`             | **Create** — WebSocket server     |
| `src/components/DocEditor.tsx`     | **Modify** — Add collaboration    |
| `src/components/CollabCursors.css` | **Create** — Cursor bubble styles |
| `src/app/globals.css`              | **Modify** — Import cursor styles |
| `package.json`                     | **Modify** — New deps + scripts   |
| `Dockerfile`                       | **Modify** — Run both servers     |
| `.env.local`                       | **Modify** — Add WS env vars      |

## Risks & Mitigations

- **Content duplication on simultaneous first load**: If two clients connect at the exact same time to a fresh document, both might try to set initial content. In practice this is extremely unlikely (Hocuspocus serializes initial sync), and Yjs CRDT merging handles it gracefully even if it happens.
- **Large documents**: Yjs documents grow over time with edit history. For now this is acceptable; garbage collection can be added later.
- **CTRL-C must kill both**: `concurrently -k` (kill others on failure) handles this. Tested pattern.
