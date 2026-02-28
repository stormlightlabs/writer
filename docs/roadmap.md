---
title: "Roadmap"
last_updated: 2026-02-28
---

## Drag-and-drop

Sidebar reorder, cross-location move, external file import, and nested folder creation using `@atlaskit/pragmatic-drag-and-drop`. Full design in [spec](../.sandbox/drag-and-drop.md).

### Tasks

1. **Sidebar draggable items** - register `DocumentItem` as `draggable()` + `dropTargetForElements()` with hitbox edge detection
2. **Cross-location drops** - register `SidebarLocationItem` as drop target; move doc via `docMove`
3. **Monitor & dispatch** - `monitorForElements` in `Sidebar.tsx` to orchestrate reorder vs. move on drop
4. **Drop indicators & feedback** - insertion line, ghost opacity, drop-target highlight ring
5. **External file drops** - Tauri `onDragDropEvent` listener; resolve target from pointer position; import `.md` files via `docSave`
6. **Accessibility** - screen-reader announcements via `live-region`; reduced-motion support via `useSkipAnimation()`
7. **Nested folder creation** - modifier-key drop opens `MoveDialog` pre-filled; backend `create_dir_all` handles new dirs

## Content blocks (transclusion)

Allow embedding external Markdown files, images, and CSV data into a master document using `/filename` syntax, as well as drag-and-drop of files into the editor.

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

1. **Outline utilization**
   - Use Rust-generated `metadata.outline` from `markdown_render` in the UI for document structure navigation/jump-to-heading behavior
2. **Perf**
   - Incremental render scheduling (debounce, worker thread)
   - Indexing in background with progress events with UI feedback
3. **Recovery**
   - Corrupt settings/workspace → app resets safely
   - Missing location root → UI prompts to relink/remove
