# GitHub Integration

This document describes how Focal interacts with remote GitHub repositories in **remote mode**. Remote mode is active when the `GITHUB_REPOS` environment variable is set. When it is empty or unset, Focal runs in **local mode** instead (see [Repository Modes](repos)).

## Overview

In remote mode, Focal clones GitHub repositories to `/tmp/focal/repos` and interacts with them through Git. Repositories are configured via the `GITHUB_REPOS` environment variable. Focal scans each repo's `.focal/tasks/` directory for Markdown task files, allows editing them through the UI, and commits/pushes changes back.

## Configuration

### Environment variable

```
GITHUB_REPOS=owner/repo,owner/repo2,org/repo3
```

Repositories are specified as comma-separated `owner/repo` slugs (e.g. `axios/axios,curl/curl,psf/requests`). Full URLs are not accepted — only the slug form.

### Authentication

Focal authenticates to GitHub using a **fine-grained personal access token** (PAT) stored in the `GITHUB_TOKEN` environment variable.

```
GITHUB_TOKEN=github_pat_...
```

The token must have the following permissions on each repository listed in `GITHUB_REPOS`:

| Permission | Access         | Reason                                          |
| ---------- | -------------- | ----------------------------------------------- |
| Contents   | Read and write | Clone repos, read `.focal/tasks/`, push commits |

No other permissions are required. Focal does not interact with issues, pull requests, actions, or any other GitHub API surface.

**Token scoping:** Fine-grained PATs can be scoped to specific repositories. This is strongly recommended — scope the token to exactly the repositories listed in `GITHUB_REPOS` and nothing else.

## How it works

### 1. Clone / sync

On startup, Focal ensures each configured repository is cloned locally into `/tmp/focal/repos/<owner>/<repo>`. If a repo is already cloned, Focal does a hard reset to match the remote (`git fetch origin && git reset --hard origin/<branch>`), ensuring a clean slate. This sync happens **once per server process** — subsequent page loads skip the pull so that edits made through the UI are preserved until the server restarts.

```
/tmp/focal/repos/
├── axios/
│   └── axios/          # cloned from github.com/axios/axios
├── curl/
│   └── curl/           # cloned from github.com/curl/curl
└── psf/
    └── requests/       # cloned from github.com/psf/requests
```

Clone and pull use the authenticated HTTPS remote:

```
https://x-access-token:{GITHUB_TOKEN}@github.com/{owner}/{repo}.git
```

The token is used only in the Git remote URL. It is never logged, never sent to the client, and never stored on disk outside of the Git remote config inside the local clone.

### 2. Read tasks

Focal scans `/tmp/focal/repos/{owner}/{repo}/.focal/tasks/` for `.md` files and parses their YAML frontmatter, exactly as before. The repository display name is `{owner}/{repo}`.

### 3. Edit tasks

When a user saves a task through the edit form, Focal writes the updated frontmatter to the Markdown file in the cloned copy under `/tmp/focal/repos/`. This is a local filesystem operation — nothing is sent to GitHub at this point. (In local mode, writes go directly to the working directory instead; see [Repository Modes](repos).)

### 4. Commit and push

When the user clicks "Commit changes" (or presses `Ctrl+Enter`), Focal:

1. Stages changed files: `git add .focal/tasks/`
2. Commits locally: `git commit -m "Update tasks"`
3. Pushes to the remote: `git push`

The push is the only network operation that modifies the remote repository.

## Security model

### Principle of least privilege

- The `GITHUB_TOKEN` should be a **fine-grained PAT scoped to the exact repositories** Focal manages. Classic tokens with broad `repo` scope should not be used.
- The only required permission is **Contents: Read and write**. Focal does not need access to issues, PRs, webhooks, or admin settings.
- The token is never exposed to the browser. All Git operations happen server-side in Next.js server actions.

### Path validation

Before writing any file, Focal validates that the resolved file path is within the allowed root directory. In remote mode this is `/tmp/focal/repos/`; in local mode it is the local Git root. This prevents path traversal attacks where a crafted request could write outside the expected tree.

### Input validation

- Repository slugs from `GITHUB_REPOS` are validated against the pattern `^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$` before use. Invalid slugs are rejected.
- File paths are resolved and checked to stay within the repo's `.focal/tasks/` subtree.
- Frontmatter values (`status`, `priority`) are validated against known enums before writing.

### Token handling

- `GITHUB_TOKEN` is read from the environment at runtime, never from a config file.
- The token appears in the Git remote URL inside local clones in `/tmp/focal/repos/`, which is outside the project directory and never committed.
- The token is never included in API responses, client-side bundles, or log output.

### Network surface

Focal makes exactly two types of network calls to GitHub:

1. `git clone` / `git pull` — to fetch repository contents
2. `git push` — to push committed task changes

There are no GitHub API calls. All interaction is over Git HTTPS.

## Error handling

| Scenario                               | Behavior                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `GITHUB_REPOS` is not set              | Focal runs in local mode — uses the current Git working tree                                                  |
| `GITHUB_TOKEN` is not set              | Clone/push fails; board shows read-only local data if repos are already cloned                                |
| Token lacks permissions on a repo      | That repo is skipped; other repos load normally                                                               |
| Push fails (e.g. branch protection)    | Error is surfaced in the commit bar UI                                                                        |
| Push conflict (remote has new commits) | Focal pulls before pushing; if there's a merge conflict in `.focal/tasks/`, the error is surfaced to the user |
