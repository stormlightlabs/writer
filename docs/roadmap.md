---
title: "Roadmap"
last_updated: 2026-03-19
---

## Tangled string integration

Publish documents as [Tangled strings](https://tangled.sh) (AT Protocol gists) and import strings as documents.

### Part 1 — Auth

1. **OAuth loopback flow** - `src-tauri/src/atproto/auth.rs`
2. **Session persistence** - token + DPoP key storage in app data dir
3. **Tauri commands** - `atproto_login`, `atproto_logout`, `atproto_session_status`
4. **Frontend auth UI** - login sheet, session indicator, logout
   - User clicks `@` button in toolbar
   - If not logged in, show login sheet
   - If logged in, show session indicator (Dolly from `icons.tsx`)
   - Logout button in session indicator or in the settings menu

### Part 2 — Pull

1. **Tauri commands** - `string_list`, `string_get`
2. **Import UI** - "Import from Tangled" sheet with handle input, string browser, preview, import to location
   - Fluent Icons (`i-fluent-document-*-16-filled`)
   - Extensions covered: `py`, `md`, `js`, `ts`, `yaml`, `java`, `sass`, `css`, `csv`, `fs`, `cs`
   - `i-fluent-document-16-filled` for fallback

### Part 3 — Push

1. **Tauri commands** - `string_create`, `string_update`, `string_delete`
2. **Publish UI** - "Publish as String" action in export menu with filename, description, preview

### Part 4 — Sync & metadata

1. **Origin tracking** - AT URI, TID, source DID in SQLite
2. **Change detection** - local re-publish offers, remote drift on re-pull

## Drag-and-drop

Sidebar reorder, cross-location move, external file import, and nested folder creation using `@atlaskit/pragmatic-drag-and-drop`. Full design in [spec](../.sandbox/drag-and-drop.md).

### Part 1

1. **Sidebar draggable items** - register `DocumentItem` as `draggable()` + `dropTargetForElements()` with hitbox edge detection
2. **Drop indicators & feedback** - insertion line, ghost opacity, drop-target highlight ring
3. **Monitor & dispatch** - `monitorForElements` in `Sidebar.tsx` to orchestrate reorder vs. move on drop

### Part 2

1. **Cross-location drops** - register `SidebarLocationItem` as drop target; move doc via `docMove`
2. **External file drops** - Tauri `onDragDropEvent` listener; resolve target from pointer position; import `.md` files via `docSave`
3. **Nested folder creation** - modifier-key drop opens `MoveDialog` pre-filled; backend `create_dir_all` handles new dirs

### Part 3

1. **Accessibility** - screen-reader announcements via `live-region`; reduced-motion support via `useSkipAnimation()`

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
