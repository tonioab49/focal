---
title: Sort sidebar entries with files before directories
status: done
priority: medium
---

## Description

Currently the sidebar mixes files and directories without a specific order. Directories should be sorted after files so that individual files are more immediately visible.

## Acceptance Criteria

- [ ] In the sidebar file tree, all files at a given level appear before any directories at that same level
- [ ] Within each group (files and directories), alphabetical order is preserved
- [ ] The sort applies recursively at every level of the tree

## Related Files

- `src/components/Sidebar.tsx`
- Any utility responsible for sorting/rendering the file tree
