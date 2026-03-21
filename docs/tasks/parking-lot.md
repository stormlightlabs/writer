---
title: "Parking Lot"
description: >
    A collection of ideas/proposals for new features and quick bug notes.
updated: 2026-03-21
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

- We should let users distinctly pick editor and PDF font in settings and export
