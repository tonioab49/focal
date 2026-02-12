# Documentation System

This document describes how Focal handles documentation files alongside tasks.

## Overview

Focal scans the `.focal/docs/` directory in each configured repository for Markdown files and displays them in the sidebar under the "Documentation" section. Users can view and edit documentation through a rich text editor powered by Tiptap, with changes committed and pushed to GitHub just like task edits.

## Directory Structure

```
.focal/
├── tasks/
│   └── *.mdx           # Task files (Kanban board)
└── docs/
    ├── index.md        # Documentation root
    ├── getting-started.md
    └── guides/
        ├── setup.md
        └── deployment.md
```

Documentation files are standard Markdown (`.md`). Subdirectories are supported and reflected in the sidebar hierarchy.

## Sidebar Integration

The sidebar scans `.focal/docs/` and builds a table of contents:

```
Tasks
──────────────
Documentation
  ├── Index
  ├── Getting Started
  └── Guides
      ├── Setup
      └── Deployment
```

- File names are converted to display titles (e.g., `getting-started.md` → "Getting Started")
- Directories become collapsible sections
- The active document is highlighted
- Files are sorted alphabetically, with `index.md` always first

## Editor

Documentation is edited using the [Tiptap Simple Editor](https://tiptap.dev/docs/ui-components/templates/simple-editor) template.

### Features

- Rich text editing with a formatting toolbar
- Support for headings, bold, italic, code, links, lists, blockquotes
- Markdown shortcuts (e.g., `# ` for headings, `**` for bold)
- Clean, minimal UI that matches Focal's design

### Implementation

- Install Tiptap packages: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`
- Create a `DocEditor` component wrapping Tiptap's editor
- Load Markdown content, convert to HTML for editing, convert back to Markdown on save
- Use `turndown` library for HTML → Markdown conversion
- Use `marked` or `remark` for Markdown → HTML conversion

## Routes

| Route | Description |
|-------|-------------|
| `/docs` | Documentation index (redirects to first doc or shows welcome) |
| `/docs/[...slug]` | View/edit a specific document |

The `[...slug]` catch-all matches the file path relative to `.focal/docs/`, e.g.:
- `/docs/getting-started` → `.focal/docs/getting-started.md`
- `/docs/guides/setup` → `.focal/docs/guides/setup.md`

## Editing Flow

1. User navigates to a doc via the sidebar
2. Document loads in read-only view mode
3. User clicks "Edit" button (or presses `E`)
4. Tiptap editor activates with the document content
5. User makes changes using the rich text toolbar or Markdown shortcuts
6. User clicks "Save" (or presses `⌘S`)
7. Content is converted back to Markdown and written to disk
8. User returns to view mode
9. Changes appear in the commit bar at the bottom
10. User commits and pushes when ready

## Server Actions

### `loadDocs()`

Scans all configured repositories for `.focal/docs/` directories and returns a tree structure:

```typescript
interface DocNode {
  slug: string;        // URL path segment
  title: string;       // Display name
  filePath: string;    // Absolute path on disk
  children?: DocNode[]; // Subdirectories
}
```

### `getDocContent(filePath: string)`

Reads and returns the raw Markdown content of a document.

### `saveDoc(filePath: string, content: string)`

Writes Markdown content to disk. Validates:
- Path is within a `.focal/docs/` directory
- Path is within the allowed root (local Git root in local mode, `REPOS_DIR` in remote mode)

### Existing actions

- `getUncommittedFiles()` — extended to include `.focal/docs/` changes
- `commitChanges()` — extended to stage `.focal/docs/` alongside `.focal/tasks/`

## Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `E` | Doc view | Enter edit mode |
| `⌘S` | Doc edit | Save document |
| `Escape` | Doc edit | Cancel editing, return to view |

These are added to the existing keyboard shortcuts system and displayed in the `?` help dialog.

## Security

Same security model as tasks:

- File paths validated to stay within the allowed root directory (local Git root or `REPOS_DIR`) and `.focal/docs/` subtree
- No arbitrary file writes outside the expected directories
- Content is treated as Markdown text, not executed
- Git operations happen server-side only

## Dependencies

New packages required:

```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-link": "^2.x",
  "marked": "^12.x",
  "turndown": "^7.x"
}
```

## Related Files

- `src/app/docs/page.tsx` — Documentation index
- `src/app/docs/[...slug]/page.tsx` — Document view/edit page
- `src/components/DocEditor.tsx` — Tiptap editor wrapper
- `src/components/DocViewer.tsx` — Markdown renderer for view mode
- `src/components/Sidebar.tsx` — Extended with docs tree
- `src/lib/docs.ts` — Doc scanning and parsing utilities
- `src/app/actions.ts` — Extended with doc save action
