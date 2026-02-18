---
title: Repo-Wide Doc Discovery
status: done
---

Scan the entire repository for `*.md` files instead of only looking inside `.focal/docs/`.

## Scope

- Use `git ls-files` for discovery (fast, respects `.gitignore`)
- Always include `.focal/docs/`; exclude all other dot directories
- Support `.focal/.focalignore` for additional exclusions
- Slugs relative to repo root (e.g. `{repo}/.focal/docs/guide`)
- Per-directory "+" button in sidebar for creating docs in specific subdirectories
- `commitChanges` stages only `*.md` files (not the entire `.focal/` dir)
- `saveDoc` allows editing any `.md` outside `.focal/tasks/`
