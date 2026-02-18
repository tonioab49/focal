# Goal

- Fix Docker runtime issues affecting proxied requests and in-container commits.
- Improve remote-mode Git commit reliability when origin advances.
- Add a production-host banner for `focal.ablg.io` users.

# Context / assumptions

- User saw proxy validation failure: `x-forwarded-host=localhost` vs `origin=localhost:4000` when using Docker.
- Container serves traffic through nginx, proxying `/` to Next.js and `/ws` to Hocuspocus.
- Existing nginx `Host` forwarding used `$host`, which can omit explicit port.
- User saw Git commit failure in container due to missing author identity for runtime user.
- Docker image build configured Git identity globally as root; runtime process uses `nextjs` user.
- Remote mode commit previously executed `add -> commit -> push` with no upstream integration step.
- User requested explicit rebase against origin after successful commit in remote mode.
- User requested banner only when hostname is `focal.ablg.io` and message should include a GitHub link.
- Assumed active remote repo slug (`owner/repo`) is available via `selectedRepo` in that environment.
- UNKNOWN: final canonical public repo URL if `selectedRepo` is not a slug (fallback currently `https://github.com`).

# Decisions made

- nginx proxy now forwards host with port using `$http_host`.
- Added `X-Forwarded-Host` explicitly for both `/` and `/ws` proxy locations.
- Docker Git identity now set at system scope and includes both email and name.
- Added `rebaseRepo(repoPath)` helper:
- `git fetch origin`
- determine current branch
- `git rebase origin/<branch>`
- on failure attempt `git rebase --abort`, then surface error
- Remote-mode `commitChanges()` now runs rebase after commit and before push; rebase/push failures are tracked per repo.
- Added host-gated client banner in `AppShell`:
- shown only when `window.location.hostname === "focal.ablg.io"`
- text: “This is Focal running against its own Github repo (link). Feel free to report bugs and create tasks.”
- link points to `https://github.com/${selectedRepo}` when `selectedRepo` is a slug.

# Artifacts

- Modified: `docker/nginx/default.conf.template`
- Modified: `Dockerfile`
- Modified: `src/lib/github.ts`
- Modified: `src/app/actions.ts`
- Modified: `src/components/AppShell.tsx`
- Added: `src/lib/__tests__/remote-commit-rebase.test.ts`
- Validation:
- `yarn vitest src/lib/__tests__/remote-commit-rebase.test.ts` passed.
- `yarn lint` passed.

# If we resume

- Rebuild Docker image and rerun container to apply nginx and Git config changes.
- Verify `localhost:4000` no longer triggers forwarded-host mismatch.
- Verify remote-mode commit path in running app performs commit -> rebase -> push without non-fast-forward failures.
- Confirm banner appears on `focal.ablg.io` and not on local/dev hosts.
- If needed, document banner behavior in product/docs pages.
