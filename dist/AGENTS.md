# Project: FOCAL

Focal is a file-centric task and documentation manager for software projects.
It parses multiple git repositories and find tasks in mdx format, and displays them in a combined Kanban board.

## Technical choices

- Typescript
- NextJS
- React
- Tailwind CSS
- Yarn package manager

## Rules to follow to discover relevant context

- Always read the docs in .focal/docs when you are missing context

### Handoffs

- Write a session handoff note in .focal/docs/handoffs using the template below.
- Format: YYYY-MM-DD/[2-3-word-summary]-xxxx.mdx, with summary in lowercase kebab-case and xxxx a random alphanumeric (a-zA-Z0-9) string
- Keep it under 300–500 words.
- Use bullets, no prose.
- Include only information that would help resume work later; do not re-explain basics.
- If anything is ambiguous or unverified, mark it explicitly as UNKNOWN.
- If you made code changes, include exact file paths and a minimal diff summary.
- Do not create a handoff file for every message or question I ask you inside a session. Create exactly one handoff file per session.

### Template for handoffs

```md
# Goal

(1–2 lines)

# Context / assumptions

(bullets)

# Decisions made

(bullets)

# Artifacts

(links/paths: PRs, branches, files touched, docs created)

# If we resume

“Start by doing X, then Y” (2–5 bullets)
```
