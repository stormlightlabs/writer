---
title: Syntax Extensions
updated: 2026-04-15
---

Allow embedding external Markdown files, images, and CSV data into a master document using `/filename` syntax, as well as drag-and-drop of files into the editor.

## Content Blocks

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

## Wikilinks

`[[Page Name]]` and `[[Page Name|display text]]` syntax for linking between documents within a location.

### Tasks

1. **Comrak wikilinks** — enable `wikilinks_title_after_pipe: true` on `GfmSafe` and `Extended` profiles in `crates/markdown/src/lib.rs`. Comrak renders `[[target|text]]` as `<a href="target" data-wikilink>text</a>`. Map the `href` to a resolved relative path at render time.
2. **Rust resolution command** — `wikilink_resolve(location_id, from_path, target) -> Option<String>`. Fuzzy-match `target` against indexed document titles/filenames in the location's `documents` table. Return the relative path or `None`.
3. **Parser metadata** — extract wikilinks during `extract_metadata` (new `metadata.wikilinks: Vec<WikilinkRef>` with `target`, `display_text`, `resolved_path`). Powers backlink queries and broken-link diagnostics.
4. **Editor autocomplete** — Lezer `@lezer/markdown` `MarkdownExtension` to parse `[[` as an inline node. Register a `@codemirror/autocomplete` source that triggers on `[[`, fetches document titles via the `doc_list` command, and inserts `[[Title]]`. Close on `]]` or `Escape`.
5. **Preview click handling** — intercept `data-wikilink` anchor clicks in preview webview, resolve to `(location_id, rel_path)`, and navigate via the existing `onSelectDocument` callback.
6. **Broken-link diagnostic** — if `wikilink_resolve` returns `None`, emit a warning diagnostic. Surface in the diagnostics panel.
7. **Tests** — Rust: resolution fuzzy matching, metadata extraction, broken-link diagnostic. Frontend: autocomplete trigger/insert, preview click navigation.
