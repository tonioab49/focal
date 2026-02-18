---
title: Add responsive sidebar layout with navigation
status: done
priority: high
---

## Description

Redesign the application layout to be full-width and add a persistent left sidebar for navigation. The sidebar will contain links to different sections of Focal, starting with the Task Manager (Kanban board) and eventually a documentation table of contents.

## Acceptance Criteria

- [ ] Layout fills the full width of the screen (remove max-w-6xl constraint)
- [ ] Left sidebar is always visible on desktop (min-width ~250px)
- [ ] Sidebar collapses or becomes a hamburger menu on mobile
- [ ] Sidebar contains a "Tasks" link that navigates to the Kanban board (/)
- [ ] Sidebar has a placeholder section for "Documentation" table of contents
- [ ] Main content area scrolls independently from sidebar
- [ ] Active navigation item is visually highlighted
- [ ] Keyboard shortcut to toggle sidebar visibility (e.g. `[`)

## UI Structure

```
┌─────────────────────────────────────────────────────────┐
│  Focal                                        [?] help  │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│  Tasks  ←  │   Kanban Board                             │
│            │   ┌─────────┬─────────┬─────────┐          │
│  ──────    │   │ To Do   │ In Prog │ Done    │          │
│            │   │         │         │         │          │
│  Docs      │   │  ...    │  ...    │  ...    │          │
│  (future)  │   │         │         │         │          │
│            │   └─────────┴─────────┴─────────┘          │
│            │                                            │
│            │   [Commit Bar]                             │
└────────────┴────────────────────────────────────────────┘
```

## Technical Notes

- Create a new `AppShell` or `Layout` component that wraps page content
- Use CSS Grid or Flexbox for the two-column layout
- Sidebar width: 250px on desktop, full overlay or hidden on mobile (breakpoint: md/768px)
- Consider using Next.js layout.tsx for the shell so it persists across navigation
- The sidebar state (open/closed on mobile) should be managed with React state
- Add the sidebar toggle shortcut to the existing keyboard shortcuts system

## Related Files

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/Sidebar.tsx` (new)
- `src/components/ShortcutHelp.tsx` (add new shortcut)
