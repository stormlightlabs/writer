---
title: "Roadmap"
last_updated: 2026-02-27
---

## Export

Multi-format document export with live preview, building on the existing `@react-pdf/renderer` pipeline and adding DOCX and plaintext output.

### Tasks

1. **Plaintext export**
   - Strip all Markdown formatting from the raw document text (headings → plain text, remove `**`, `_`, `` ` ``, link syntax, etc.)
   - Preserve logical structure: blank lines between paragraphs, indentation for list items, `---` for horizontal rules
   - Save via Tauri `save` dialog with `.txt` filter
   - Add "Plain Text" option to the export dialog
2. **DOCX export**
   - Add [`docx-rs`](https://github.com/bokuweb/docx-rs) as a Cargo dependency in `src-tauri/Cargo.toml`
   - Implement a `markdown_ast_to_docx` Tauri command that accepts the Markdown AST (or raw text via `markdown_to_docx`), converts it to a `.docx` byte buffer using `docx-rs` (`Docx`, `Paragraph`, `Run`, heading levels, code blocks, lists, blockquotes), and returns `Vec<u8>` to the frontend
   - Support basic formatting: bold, italic, code font, ordered/unordered lists, blockquotes, headings 1-3
   - Frontend receives the blob, prompts the Tauri `save` dialog with `.docx` filter, and writes with `writeFile`
   - Add "DOCX" option to the export dialog alongside "PDF"

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

## Source of Truth (Rust-Side State)

Migrate core application state and heavy computation to the Rust backend to reduce frontend complexity and improve performance.

### Tasks

1. **Session & Tab Management**
   - Shift `TabsStore` logic to a persistent Rust-based session manager
   - Support session persistence across application restarts and potential multi-window sync
2. **Reactive File System**
   - Leverage `RecommendedWatcher` to eliminate the need for manual frontend file list updates
   - Implement event-driven UI updates based on backend file system events
3. **High-Performance Analysis**
   - Move `PatternMatcher` and `StyleCheck` logic to Rust using the `aho-corasick` crate
   - Offload heavy multi-pattern matching from the JS main thread
4. **Unified Metadata Extraction**
   - Calculate document metadata (word counts, outlines) during the `markdown_render` pass in Rust
5. **Architectural Hardening**
   - Simplify and unify `CommandResult` and `AppError` patterns across all Tauri commands

## Hardening

### Tasks

1. **Perf**
   - Incremental render scheduling (debounce, worker thread)
   - Indexing in background with progress events with UI feedback
2. **Recovery**
   - Corrupt settings/workspace → app resets safely
   - Missing location root → UI prompts to relink/remove
