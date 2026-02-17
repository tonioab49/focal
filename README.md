# Focal

A file-centric task and documentation manager that lives inside your Git repos.

![Focal Kanban Board](docs/screenshot.png)

Focal stores tasks and docs as plain files (`.mdx` / `.md`) in a `.focal/` directory at the root of your repositories. It aggregates them into a Kanban board and a documentation browser with a rich text editor — then commits changes back through Git.

## Why

Project management tools drift from the code. Focal keeps tasks and docs version-controlled alongside the source, editable from a web UI or any text editor, and visible across multiple repos at once.

## Quick start

```bash
# Clone and install
git clone https://github.com/your-org/focal.git
cd focal
yarn install

# Run (Next.js + collaboration server)
yarn dev
```

Open [http://localhost:3000](http://localhost:3000). Focal will read `.focal/` from the current Git repo.

### Docker

```bash
docker build -t focal .
docker run --rm -p 4000:4000 focal
```

## How it works

Create a `.focal/` directory in any repo:

```
.focal/
├── tasks/
│   └── implement-auth.mdx    # Task with YAML frontmatter
└── docs/
    └── getting-started.md     # Markdown documentation
```

Tasks use MDX with frontmatter for metadata:

```mdx
---
title: Implement OAuth2 flow
status: in-progress
priority: high
assignee: alice@example.com
---

## Description

Add OAuth2 support for Google and GitHub login.
```

Focal parses these files and renders them as a Kanban board (`todo` / `in-progress` / `done`). Edit from the UI, then commit and push without leaving the browser.

## Features

- **Kanban board** across one or many repos
- **Rich text doc editor** with Markdown shortcuts (powered by Tiptap)
- **Realtime collaboration** — multiple users can edit docs simultaneously with live cursors (via Hocuspocus/Yjs)
- **Git-native workflow** — edit, commit, and push from the UI; changes are just files in your repo
- **Two modes**: local (read from your working tree) or remote (clone GitHub repos via `GITHUB_REPOS` env var)

## Configuration

| Variable          | Default                | Description                                        |
| ----------------- | ---------------------- | -------------------------------------------------- |
| `GITHUB_REPOS`    | _(unset = local mode)_ | Comma-separated `owner/repo` slugs for remote mode |
| `GITHUB_TOKEN`    | —                      | Fine-grained PAT with Contents read/write          |
| `HOCUSPOCUS_PORT` | `1236`                 | WebSocket server port                              |

## Tech stack

Next.js, React, TypeScript, Tailwind CSS, Tiptap, Hocuspocus, Yjs

## License

MIT
