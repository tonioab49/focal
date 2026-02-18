# Git Workflow

Focal tracks uncommitted changes to `.focal/` files and provides a built-in commit & push flow so you can save your work without leaving the UI.

## Status Indicator

A small indicator appears in the top-left corner of the sidebar, next to the "Focal" title. It is visible on every page.

- **Grey dot** — No uncommitted changes in any `.focal/` directory.
- **Amber dot + count** — There are uncommitted files. Click the indicator to open the details modal.

Only files under `.focal/docs/` and `.focal/tasks/` are tracked. Other files in `.focal/` (e.g. configuration) are ignored.

## File Statuses

Each changed file is labelled with one of two statuses:

| Badge        | Meaning                                             |
| ------------ | --------------------------------------------------- |
| **new**      | The file is untracked by git (newly created)        |
| **modified** | The file already exists in git and has been changed |

## Commit & Push (Remote Mode)

When Focal is running against cloned repositories (remote mode), the modal includes a **Commit & Push** button. Clicking it will:

1. Stage all changes under `.focal/` in each repository
2. Create a commit with the message "Update focal content"
3. Push to the remote

You can also trigger this with the keyboard shortcut `Ctrl+Enter` from anywhere.

After a successful commit, the indicator resets and the page refreshes to reflect the new state.

## Local Mode

When Focal is running in local mode (reading `.focal/` from your current working tree), the commit button is disabled. This is intentional — committing from the Focal UI in local mode could conflict with your in-progress git work (staged files, rebases, etc.).

In local mode, commit your changes from your terminal as you normally would:

```sh
git add .focal/
git commit -m "Update focal content"
git push
```

The indicator will update on the next page navigation.
