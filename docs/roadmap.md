# Roadmap

## Focus mode enhancements (typewriter scrolling + sentence dimming)

Evolve the existing Focus toggle into a writing environment. This should be the default mode.

### Tasks

1. **Typewriter scrolling**
   - Keep the active line vertically centered in the viewport at all times
   - CodeMirror extension that overrides scroll behavior on cursor movement
   - Respect user preference toggle (on/off), persist via settings
2. **Sentence-level dimming**
   - Dim all text except the current sentence being edited
   - Use CodeMirror decorations to apply reduced-opacity styling to non-active sentences
   - Sentence boundary detection (period/question mark/exclamation + whitespace)
3. **Paragraph-level dimming** (alternative mode)
   - Same approach, but scope is the current paragraph instead of sentence
   - Expose a three-way toggle: Off / Sentence / Paragraph
4. **Visual polish**
   - Smooth opacity transitions when moving between sentences/paragraphs
   - Ensure dimming interacts correctly with existing Oxocarbon themes (dark + light)

## Writer's syntax highlighting (parts of speech)

Color text by grammatical role to help writers spot weak phrasing during editing.

### Tasks

1. **NLP tokenizer integration**
   - Evaluate lightweight browser-side NLP libraries (compromise, wink-nlp) for POS tagging
   - Alternatively, implement Rust-side tagging via `nlprule`
2. **POS decoration layer**
   - Map POS tags → color tokens:
     - Nouns → Red, Verbs → Blue, Adjectives → Brown, Adverbs → Purple, Conjunctions → Green
   - Apply as CodeMirror view decorations (marks), re-computed on text change (debounced)
3. **Toggle + settings**
   - Add to settings panel
   - POS coloring is a "metadata view" — never affects export or preview output
4. **Performance guardrails**
   - Tag only the visible viewport + buffer zone, not the entire document
   - Cache POS results per paragraph; invalidate on edit

## Style check (fillers, redundancies, clichés)

Real-time prose polish that flags weak patterns without altering the source text.

### Tasks

1. **Pattern engine**
   - Curate dictionaries:
     - Fillers (e.g. "basically", "actually", "just", "really")
     - Redundancies (e.g. "absolutely essential", "end result")
     - Clichés (e.g. "at the end of the day", "think outside the box")
   - Match via trie against document text
2. **Virtual strikethrough decorations**
   - Render flagged spans with a CSS strikethrough in the editor (CodeMirror decoration)
   - Non-destructive: decorations are editor-only, not part of the Markdown AST
3. **Diagnostics panel**
   - Show categorized list of flagged items with line references
   - Click-to-navigate from panel to editor location
4. **User customization**
   - Allow adding/removing patterns from each dictionary
   - Persist custom dictionaries in settings/store

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

1. **Security**
   - Prove: no fs access outside scoped locations
   - Prove: preview cannot execute scripts (CSP / sandbox strategy)
2. **Perf**
   - Incremental render scheduling (debounce, worker thread)
   - Indexing in background with progress events
3. **Recovery**
   - Corrupt settings/workspace → app resets safely
   - Missing location root → UI prompts to relink/remove
