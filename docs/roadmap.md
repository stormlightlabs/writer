---
title: "Roadmap"
last_updated: 2026-02-23
---

## Focus mode enhancements (typewriter scrolling + sentence dimming)

Evolve the existing Focus toggle into a stronger writing environment.

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
   - Use wink-nlp (TS)
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

1. **Pattern engine** - Aho-Corasick automaton for O(n+m) matching
   - Dictionaries seeded from retext ecosystem (MIT licensed):
     - Fillers: `fillers`, `hedges`, `weasels` packages (~375 patterns)
     - Redundancies: `retext-simplify` (~240 patterns with suggestions)
     - Clichés: `no-cliches` package (~330 patterns)
2. **Virtual strikethrough decorations**
   - CodeMirror ViewPlugin with Decoration.mark()
   - Category-specific colors: orange (fillers), yellow (redundancies), red (clichés)
   - Non-destructive: editor-only, not part of Markdown AST
3. **Settings integration**
   - Enable/disable style check
   - Per-category toggles (filler/redundancy/cliche)
   - Zustand store with persistence ready
4. **Diagnostics panel**
   - Show categorized list of flagged items with line references
   - Click-to-navigate from panel to editor location
5. **User customization**
   - Allow adding/removing patterns from each dictionary
   - Persist custom dictionaries in settings/store

## Global capture (shortcut + menu bar/tray quick add)

Add a global capture flow so notes can be added from anywhere in macOS without opening the full app.

### Tasks

1. **Global shortcut registration**
   - Register a user-configurable app-wide shortcut in Tauri (default: `Cmd+Shift+Space`)
   - Persist shortcut choice in settings and validate conflicts
2. **Quick-add floating window**
   - Add a lightweight always-on-top capture window for fast note entry
   - Support modes: quick note, longer writing session, and append-to-existing note
   - Keyboard-first flow: open, write, save, close without mouse interaction
3. **macOS menu bar + tray integration**
   - Add a menu bar/tray icon with actions: New Quick Note, Open Writer, Pause Shortcut, Quit
   - Show shortcut hint and last capture target in the menu
4. **Capture routing + storage**
   - Route quick captures to a default inbox note/location
   - Optional prompt to choose destination when modifier key is held
5. **Reliability + permissions**
   - Handle app lifecycle edge cases (relaunch, sleep/wake, multiple windows)
   - Add onboarding/help text for accessibility and shortcut permissions on macOS

## Calm UI defaults (focus-by-default + less intrusive chrome)

Make writing-first, low-distraction behavior the default experience while preserving power-user controls.

### Tasks

1. **Default focus mode**
   - Enable Focus mode by default for new installs and when creating/opening a document
   - Add migration logic so existing users keep current preference unless they opt in
2. **Reduce interface noise**
   - Auto-hide non-essential panels/toolbars while typing
   - Replace persistent controls with contextual/hover/focus-triggered controls where appropriate
3. **Density + spacing pass**
   - Tune spacing, contrast, and visual hierarchy to keep the editor dominant
   - Reduce competing highlights and non-critical badges in writing view
4. **Settings + escape hatches**
   - Add a simple `Calm UI` preset toggle with granular overrides
   - One-command shortcut to temporarily reveal all UI chrome
5. **Validation**
   - Usability pass for keyboard-only and screen-reader flows
   - Add regression tests for panel visibility, focus defaults, and persisted preferences

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
