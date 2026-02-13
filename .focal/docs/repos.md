# Repository Modes

Focal supports two modes for loading repositories, determined by whether the `GITHUB_REPOS` environment variable is set.

## Local mode (default)

When `GITHUB_REPOS` is empty or unset, Focal uses the **local working directory** as its single repository. It finds the nearest Git root by walking up from `process.cwd()` and loads `.focal/tasks/` and `.focal/docs/` from there.

- No cloning or pulling — the repo is already on disk
- **Edits happen directly on the local files.** When you save a task or document through the Focal UI, the `.focal/` files in your working directory are modified in place — the same files you see with `git status`. There is no intermediate copy in `/tmp`.
- The repo name is derived from the Git root directory name (e.g. `/Users/alice/src/focal` → `focal`)
- Commits are made to the local Git repo; push is attempted but non-fatal if no remote is configured

This is the simplest way to use Focal: just run it inside a Git project that has a `.focal/` directory.

## Remote mode

When `GITHUB_REPOS` is set to one or more `owner/repo` slugs, Focal clones those repositories to `/tmp/focal/repos/` and interacts with them through Git. Edits are written to these cloned copies, not to your local working directory.

```
GITHUB_REPOS=axios/axios,curl/curl,psf/requests
```

Repositories are shallow-cloned on first access. On startup, each repo is hard-reset to match the remote (`git fetch origin && git reset --hard origin/<branch>`), ensuring a fresh state. **Syncing only happens once per server process** — subsequent page loads reuse the local clone without pulling, so edits made through the UI are preserved until the server restarts. A `GITHUB_TOKEN` is required for authentication. See the [GitHub Integration](github) doc for details.

## How the mode is determined

| `GITHUB_REPOS` value | Mode | Repositories |
|----------------------|------|-------------|
| Empty / unset | Local | Single repo from the current Git working tree |
| `owner/repo,...` | Remote | Cloned GitHub repos in `/tmp/focal/repos/` |
