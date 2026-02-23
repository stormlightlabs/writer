# CHANGELOG

## Unreleased

### 2026-02-23

- Implemented Global Capture with a system-wide shortcut (Cmd+Shift+Space) and macOS system tray integration for quick note entry.
- Established Calm UI as the default experience, featuring auto-hiding chrome and Focus mode enabled by default.

### 2026-02-22

- Added Focus mode enhancements including typewriter scrolling and sentence/paragraph-level dimming.
- Introduced Writer's syntax highlighting with real-time parts-of-speech coloring (nouns, verbs, etc.).
- Implemented Style Check using the Aho-Corasick algorithm to flag fillers, redundancies, and clichés with a dedicated diagnostics panel.

### 2026-02-19

- Added Markdown preview with resizable split view and editor↔preview scroll sync.
- Full-text search across locations via SQLite FTS5 with snippet highlighting.
- Frontmatter parsing, Markdown diagnostics, and HTML/PDF export.

### 2026-02-15

- Location system with scoped permissions, persisted access, and startup reconciliation.
- Elm-style ports layer with structured command results and backend event channel.
- Document catalog with atomic saves, conflict detection, and autosave loop.
- Comrak-based Markdown engine with profiles, source-position mapping, and metadata extraction.
- CodeMirror 6 editor with Oxocarbon dark/light themes, undo/redo, and Markdown syntax highlighting.
