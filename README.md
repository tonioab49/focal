# Focal

Focal is a collaborative, Markdown-based editor for **issues** and **docs** that lives inside your Git repos.

Project management tools drift from the code and were not designed for AI agents. Focal keeps tasks and docs version-controlled alongside the source, editable from its own web UI or any text editor.

- **Markdown-based Rich Text Editor**: No database, no MCP server. Issues are stored as regular `*.mdx` files with frontmatter for fields like _priority_, docs are just regular `*.md` files
- **Realtime Collaboration**: multiple users can edit docs simultaneously with live cursors. Useful for planning/design
- **Git-backed**: No vendor lock-in. All changes are stored in git, your issues and docs evolve contextually with the code

<img width="1829" height="927" alt="image" src="https://github.com/user-attachments/assets/8ee48f11-6e00-4e5f-8257-f440de430040" />

## Live Demo

Play with a demo of Focal running on its own [repository](https://focal.ablg.io/)

## Quick start for local repositories

Try Focal on your own repo with the following instructions

```bash
cd <your favorite git repo>
npx github:tonioab49/focal
```

Open [http://localhost:3333](http://localhost:3333). Focal will read issues and docs from the local repo.

## Docker instructions

This is the recommended setup if you want to use the collaboration features in a team context

### Building the Docker image

```bash
git clone https://github.com/tonioab49/focal
cd focal
docker build -t focal .
```

### Deploying the Docker image

Depending on your environment, you would need to push this image to your registry and run it in your platform of choice (k8s, ECS, etc.)
You will need to set these environment variables:

```
# Comma-separated list of repos to target
GITHUB_REPOS=your-org/project-one,your-org/project-two

# A Github Token with read/write access to these repos
GITHUB_TOKEN=github_pat_xxxx

# In case you want to override the default port (4000) Focal is running on
PORT=xxxx
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
