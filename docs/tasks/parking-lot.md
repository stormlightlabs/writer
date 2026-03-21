---
title: "Parking Lot"
description: >
    A collection of ideas/proposals for new features and quick bug notes.
updated: 2026-03-19
---

1. **Outline utilization**
   - Use Rust-generated `metadata.outline` from `markdown_render` in the UI for document structure navigation/jump-to-heading behavior
2. **Perf**
   - Incremental render scheduling (debounce, worker thread)
   - Indexing in background with progress events with UI feedback
3. **Recovery**
   - Corrupt settings/workspace → app resets safely
   - Missing location root → UI prompts to relink/remove

---

- We should let users pick editor and PDF font in settings and export
- The new/empty (when nothing is open) document/buffer isn't good UI. We should show a welcome screen with some options like create new, open existing, import, etc.
- Toggling off word wrap should be reflected in the editor by removing horizontal padding/margins
