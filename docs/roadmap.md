---
title: "Roadmap"
last_updated: 2026-02-27
---

## Export

Multi-format document export with live preview, building on the existing `@react-pdf/renderer` pipeline and adding DOCX and plaintext output.

### Tasks

1. **PDF preview**
   - Render the existing `MarkdownPdfDocument` component into an in-dialog preview pane (re-use `pdf().toBlob()` → `URL.createObjectURL`)
   - Live-update preview when export options (page size, margins, font, header/footer) change; debounce re-renders
   - Add page navigation controls (prev / next / page indicator) over the preview
   - Show a loading skeleton while the preview is generating
   - Wire preview into `PdfExportDialog` alongside the existing `ExportOptions` panel
2. **DOCX export**
   - Add [`docx-rs`](https://github.com/bokuweb/docx-rs) as a Cargo dependency in `src-tauri/Cargo.toml`
   - Implement a `markdown_to_docx` Tauri command that accepts the Markdown AST (or raw text), converts it to a `.docx` byte buffer using `docx-rs` (`Docx`, `Paragraph`, `Run`, heading levels, code blocks, lists, blockquotes), and returns `Vec<u8>` to the frontend
   - Support basic formatting: bold, italic, code font, ordered/unordered lists, blockquotes, headings 1-3
   - Frontend receives the blob, prompts the Tauri `save` dialog with `.docx` filter, and writes with `writeFile`
   - Add "DOCX" option to the export dialog alongside "PDF"
3. **Plaintext export**
   - Strip all Markdown formatting from the raw document text (headings → plain text, remove `**`, `_`, `` ` ``, link syntax, etc.)
   - Preserve logical structure: blank lines between paragraphs, indentation for list items, `---` for horizontal rules
   - Save via Tauri `save` dialog with `.txt` filter
   - Add "Plain Text" option to the export dialog

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
