---
title: "Parking Lot"
description: >
    A collection of ideas/proposals for new features and quick bug notes.
updated: 2026-04-15
---

## Ideas

- Consider using [ignore](https://crates.io/crates/ignore) crate for directory walking.
- Semantic search?
- Audio support?

## Planned

1. **CJK Font Support**
   Released in v0.3.0
2. **Corrupted DMG / Gatekeeper quarantine**
   Resolved as of v0.3.0
3. **Outline utilization** → [spec](../specs/outline.md)
   - [ ] **Anchor generation** — populate `Heading.anchor` in `crates/markdown/src/parser.rs`, inject `id` attrs on rendered `<h1>`–`<h6>`, deduplicate collisions
   - [ ] **State & selector** — add `outlinePanelOpen` to store, `useOutline()` selector returning `Heading[]` from active doc render result
   - [ ] **OutlinePanel component** — `src/components/OutlinePanel/OutlinePanel.tsx`, indented heading list, truncation, empty state
   - [ ] **Scroll-to-heading** — preview: `postMessage` → `scrollIntoView`; editor: find heading line → CM `scrollIntoView`
   - [ ] **Layout integration** — right sidebar slot (mutual-exclusive with diagnostics), toolbar toggle, `Cmd+Shift+O` shortcut
   - [ ] **Tests** — Rust: anchor generation + dedup; Frontend: OutlinePanel render, click→scroll, empty state
4. **Perf**
   - Incremental render scheduling (debounce, worker thread)
   - Indexing in background with progress events with UI feedback
5. **Recovery**
   - Corrupt settings/workspace → app resets safely
   - Missing location root → UI prompts to relink/remove
6. **Wikilinks** → [tasks](./syntax-extensions.md#wikilinks)
   - [ ] Enable Comrak `wikilinks_title_after_pipe` on `GfmSafe`/`Extended` profiles
   - [ ] `wikilink_resolve` command — fuzzy-match target against indexed docs
   - [ ] Extract `metadata.wikilinks` during parse
   - [ ] Editor `[[` autocomplete via `@codemirror/autocomplete` + `doc_list`
   - [ ] Preview `data-wikilink` click → navigate
   - [ ] Broken-link diagnostic
   - [ ] Tests (Rust + Frontend)
7. **Find in document** → [spec](../specs/find.md)
   - [ ] Relocate focus mode from `Cmd+F` → `Cmd+E`
   - [ ] Wire `@codemirror/search` extension + `searchKeymap` into editor (new compartment)
   - [ ] Theme `.cm-search` panel for oxocarbon light/dark
   - [ ] `Cmd+Shift+H` for find & replace
   - [ ] Tests — shortcut rebinding, panel open/close
