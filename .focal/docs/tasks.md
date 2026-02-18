# Tasks in Focal

Tasks are the core unit of work in Focal. They are defined as Markdown files within your repositories and automatically aggregated into a unified Kanban board.

## Overview

Focal parses Markdown files from configured repositories and extracts task metadata from frontmatter. This allows teams to keep task definitions close to the code they relate to, while still having a centralized view of all work across projects.

All Focal data lives inside a `.focal/` directory at the root of each repository. Tasks specifically go in `.focal/tasks/`.

## Task Properties

| Property   | Type   | Required | Description                                         |
| ---------- | ------ | -------- | --------------------------------------------------- |
| `title`    | string | Yes      | The task title displayed on the Kanban board        |
| `status`   | enum   | Yes      | Current status: `todo`, `in-progress`, or `done`    |
| `priority` | enum   | No       | Task priority: `low`, `medium`, `high`, or `urgent` |
| `assignee` | string | No       | Username or email of the person assigned            |

## Task Statuses

Tasks flow through three statuses on the Kanban board:

- **todo** - Work has not started
- **in-progress** - Work is actively being done
- **done** - Work is complete

## Example Task

Tasks are defined as `.md` files with YAML frontmatter.
We rely on the filesystem unicity of filenames for identifying tasks uniquely, so no need for an id field.

```md
---
title: Implement OAuth2 authentication flow
status: in-progress
priority: high
assignee: alice@example.com
---

## Description

Implement OAuth2 authentication flow to support third-party login providers (Google, GitHub, GitLab).

## Acceptance Criteria

- [ ] Users can sign in with Google
- [ ] Users can sign in with GitHub
- [ ] Users can sign in with GitLab
- [ ] Tokens are securely stored and refreshed
- [ ] Existing users can link external accounts

## Technical Notes

Use the `next-auth` library for the implementation. The callback URLs need to be configured in each provider's developer console.

Reference implementation: https://next-auth.js.org/providers/oauth

## Related Files

- `src/lib/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/components/LoginButton.tsx`
```

## File Organization

Tasks live in the `.focal/tasks/` directory at the root of each repository. This is the standard location Focal scans when aggregating tasks.

```
project/
├── .focal/
│   └── tasks/
│       ├── implement-auth.md
│       ├── fix-memory-leak.md
│       └── upgrade-deps.md
└── src/
```

The `.focal/` directory is the source of truth for all Focal metadata within a repository. Keeping it in a dotfile directory avoids clutter in the project root while remaining version-controlled alongside the code.
