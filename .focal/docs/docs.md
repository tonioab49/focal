# Documentation System

This document describes how Focal handles documentation files alongside tasks.

## Overview

Focal scans the **entire repository** for Markdown files (`*.md` and `*.mdx`) and displays them in the sidebar under the "Documentation" section. The `.focal/docs/` directory is always included; dot directories (e.g. `.git/`, `.github/`) are excluded except for `.focal/docs/`. Users can view and edit documentation through a rich text editor powered by Tiptap, with changes committed and pushed to Git just like task edits.

## Discovery Model

Focal uses `git ls-files` to enumerate documentation files. This approach:

- Is fast (no filesystem traversal)
- Automatically respects `.gitignore` (no `node_modules/` scanning)
- Covers both tracked files and new untracked/unstaged files

### Inclusion Rules

1. **Both `.md` and `.mdx`** files are picked up everywhere in the repo
2. **`.focal/docs/`** is always included
3. **Dot directories** are excluded — any path where a segment starts with `.` is skipped, except paths under `.focal/docs/`
4. **`.focal/tasks/`** is explicitly excluded (task files are not shown as docs)

### Slug Format

Slugs are relative to the **repo root**:

| File                             | URL                                        |
| -------------------------------- | ------------------------------------------ |
| `.focal/docs/getting-started.md` | `/docs/{repo}/.focal/docs/getting-started` |
| `docs/intro.md`                  | `/docs/{repo}/docs/intro`                  |
| `README.md`                      | `/docs/{repo}/README`                      |

## Exclusions via `.focal/.focalignore`

Create `.focal/.focalignore` to exclude additional paths from the doc tree. Patterns follow `.gitignore` conventions:

```
# Build outputs
node_modules/
dist/
build/
out/
.next/
coverage/
```

- Lines starting with `#` are comments
- Patterns ending with `/` match directories at any depth
- Patterns with `*` are treated as simple globs

## Directory Structure

```
repo/
├── README.md                   # appears in docs tree
├── docs/
│   ├── intro.md               # appears in docs tree
│   └── guide/
│       └── setup.md           # appears in docs tree
└── .focal/
    ├── .focalignore            # exclusion patterns
    ├── docs/
    │   ├── index.md           # appears in docs tree
    │   └── getting-started.md # appears in docs tree
    └── tasks/
        └── *.mdx              # task files — NOT in docs tree
```

## Sidebar Integration

The sidebar builds a hierarchical table of contents from the discovered files:

```
Documentation                              [New]
  .Focal
    Docs
      Getting Started
  Docs
    Guide
      Setup
    Intro
  Readme
```

- File names are converted to display titles (e.g., `getting-started.md` → "Getting Started")
- Directories become collapsible sections
- The active document is highlighted
- Files are sorted alphabetically, with `index` files first
- **Hovering a directory** reveals a `+` button to create a new doc in that directory

## Creating New Docs

### Top-level "New" button

Clicking "New" in the Documentation section creates a new doc in `.focal/docs/` (default).

### Per-directory "+" button

Hovering over any directory in the sidebar reveals a `+` button. Clicking it creates a new doc directly inside that directory.

## Editor

Documentation is edited using the [Tiptap Simple Editor](https://tiptap.dev/docs/ui-components/templates/simple-editor) template.

### Features

- Rich text editing with a formatting toolbar
- Support for headings, bold, italic, code, links, lists, blockquotes
- Markdown shortcuts (e.g., `# ` for headings, `**` for bold)
- Clean, minimal UI that matches Focal's design

## Routes

| Route             | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| `/docs`           | Documentation index (redirects to first doc or shows welcome) |
| `/docs/[...slug]` | View/edit a specific document                                 |

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

### `loadDocTree(repoName?)`

Scans all configured repositories using `git ls-files`, applies exclusion rules, and returns a nested tree structure:

```typescript
interface DocNode {
  slug: string; // URL path: "{repo}/{path-without-ext}"
  title: string; // Display name
  filePath: string; // Absolute path on disk
  children?: DocNode[];
}
```

### `getDocContent(filePath: string)`

Reads and returns the raw Markdown content of a document.

### `saveDoc(filePath: string, content: string)`

Writes Markdown content to disk. Validates:

- Path is within the allowed root (local Git root in local mode, `REPOS_DIR` in remote mode)
- File ends with `.md` or `.mdx`
- Path is NOT within `.focal/tasks/`

### `createDoc({ title, repoName, parentDir? })`

Creates a new empty doc. `parentDir` defaults to `.focal/docs/` if not provided. Applies the same validation as `saveDoc`. Returns the new doc's slug (relative to repo root).

### `commitChanges()`

Stages and commits changed docs:

1. Stages `.focal/tasks/` (task files)
2. Stages individual changed `.md`/`.mdx` files (excluding task files)
3. Commits with message "Update focal content"
4. Pushes to remote (in remote mode)

## Security

- File paths validated to stay within the allowed root directory (local Git root or `REPOS_DIR`)
- Writes rejected if path is in `.focal/tasks/` (prevents overwriting task frontmatter)
- Only `.md`/`.mdx` files are staged during commit (no accidental staging of other files)
- Content is treated as Markdown text, not executed

## Keyboard Shortcuts

| Key      | Context  | Action                         |
| -------- | -------- | ------------------------------ |
| `E`      | Doc view | Enter edit mode                |
| `⌘S`     | Doc edit | Save document                  |
| `Escape` | Doc edit | Cancel editing, return to view |

## Related Files

- `src/app/docs/page.tsx` — Documentation index
- `src/app/docs/[...slug]/page.tsx` — Document view/edit page
- `src/components/DocEditor.tsx` — Tiptap editor wrapper
- `src/components/Sidebar.tsx` — Extended with docs tree and per-directory "+" button
- `src/lib/docs.ts` — Doc scanning and parsing utilities
- `src/app/actions.ts` — Extended with doc save/create actions
- `.focal/.focalignore` — Exclusion patterns for doc discovery
