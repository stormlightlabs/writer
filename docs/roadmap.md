---
title: "Roadmap"
last_updated: 2026-02-24
---

## Content blocks (transclusion)

Allow embedding external Markdown files, images, and CSV data into a master document using `/filename` syntax.

### Tasks

1. **Syntax definition**
   - `/path/to/file.md` on its own line = transclude that file's rendered content
   - `/path/to/image.png` = embed image
   - `/path/to/data.csv` = render as Markdown table
   - Resolve paths relative to the current document's directory, scoped within its location
2. **Rust expansion command**
   - `content_block_expand(doc_ref, block_ref) -> ExpandedBlock { kind, content }`
   - Recursion guard: cap depth, detect cycles
3. **Editor integration**
   - CodeMirror decoration: render content blocks inline as collapsed/expandable previews
   - Syntax highlighting for the `/filename` token
4. **Preview + export**
   - Expand content blocks during `markdown_render` for preview
   - Expand during PDF/HTML export so final output is self-contained
5. **CSV → table rendering**
   - Parse CSV, emit GFM table Markdown, feed into Comrak pipeline

## Library enhancements (hashtags, smart folders, favorites)

Improve file organization

### Tasks

1. **Hashtag extraction**
   - Scan document text for `#tag` patterns (exclude Markdown headings)
   - Store extracted tags in the SQLite index (`doc_tags` table)
   - Re-index tags on save and on watcher events
2. **Task list extraction**
   - Scan document for `- [ ]` patterns
   - Store extracted tasks in the SQLite index (`doc_tasks` table)
   - Re-index tasks on save and on watcher events
3. **Smart folders**
   - Predefined filter rules: tag match, date range, word-count threshold, location
   - `smart_folder_list() -> Vec<SmartFolder>`, `smart_folder_query(id) -> Vec<DocMeta>`
   - UI: render smart folders in the sidebar above/below locations
4. **Favorites**
   - Toggle-favorite on any document (`doc_set_favorite(doc_ref, bool)`)
   - Persist in SQLite; surface a "Favorites" virtual folder in the sidebar
5. **Sidebar UI updates**
   - New sections for Smart Folders and Favorites
   - Badge counts on each smart folder / favorites section
   - Drag-and-drop reorder for smart folders

## Hardening

### Tasks

1. **Perf**
   - Incremental render scheduling (debounce, worker thread)
   - Indexing in background with progress events with UI feedback
2. **Recovery**
   - Corrupt settings/workspace → app resets safely
   - Missing location root → UI prompts to relink/remove

## Responsiveness adjustments

Improve responsiveness across desktop widths and small-window usage while keeping editor workflows stable.

### Tasks

- **Baseline and guardrails**
  - Confirm hotspot map: top bars, fixed overlays/dialogs, status/tabs density, and split/sidebar constraints.
  - Define supported width tiers and expected behavior per tier.
  - Add a manual viewport checklist for core flows (open doc, edit, search, export, quick capture).
- **Core shell responsiveness**
  - Add narrow-width compaction for `AppHeaderBar` and `Toolbar` (wrapping/collapsing with clear priority rules).
  - Tune sidebar and split-pane constraints with graceful fallback when split is not feasible.
  - Use react motion for smooth transitions and animations.
  - Introduce predictable truncation and information priority for tabs and status bar.
- Create Dialog primitive that can be used for all overlays and dialogs & modals
  - Convert layout/search overlays from fixed desktop assumptions to responsive sheet/panel behavior.
  - Rework backend alert anchoring/stacking to avoid clipping at narrow widths.
  - Improve PDF export dialog sizing/scroll behavior for constrained viewports.
- Document responsiveness rules so future UI changes follow the same standards.
