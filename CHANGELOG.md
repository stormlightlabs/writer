# CHANGELOG

## Unreleased

## v0.3.0

### Added

- AT Protocol integration (login with your [internet handle](https://internethandle.org/))
- Import strings (snippets) from [Tangled](https://tangled.org/)
- Import [standard.site](https://standard.site/) posts ([Leaflet](https://leaflet.pub))

### Changed

- UI/Design overhaul - reduced visual clutter
- Persist Sidebar/File Browser state between reloads
- New app icon

## v0.2.0 — 2026-03-20

### Features

- Drag-and-drop file browser: reorder documents, move across locations, and import external `.md` files from the OS.
- Visual feedback for insertion points and folder expansion during drag operations.
- Context menu on sidebar items (move, rename, delete).
- Nested directory support with atomic directory operations.
- Automatic "Markdown Tutorial" added to new workspace locations.
- PDF, DOCX, and plaintext export with filename sanitization.
- PDF preview in the export flow.
- Resizable markdown preview split view.
- Draggable Help sheet and routed sheets for diagnostics/style checking.
- Focus mode save indicator.
- App version displayed in the UI.
- Log rotation.
- Project website (`www/`) built with marked + nunjucks.

### Refactors

- Session state management moved to Rust (NLP algorithms, event-driven filesystem updates).
- Zustand store split from monolith into slices.
- Centralized backend event handling.
- Decoupled app entry point state flow.
- Consolidated constants and cleaned up theming.

### Fixes

- Resolved DnD collision between Tauri and HTML5 event handlers.
- Fixed document ref save collision.
- Fixed session restore on startup (last opened document).
- Fixed parts-of-speech range calculation and highlighting.
- Fixed filesystem listing wiring.
- Pinned tauri-action in CI.

## v0.1.0 — 2026-02-26

- Initial stable release of Writer.
- Location system with scoped permissions, persisted access, and startup reconciliation.
- Elm-style ports layer with structured command results and backend event channel.
- Document catalog with atomic saves, conflict detection, and autosave loop.
- Comrak-based Markdown engine with profiles, source-position mapping, and metadata extraction.
- CodeMirror 6 editor with Oxocarbon dark/light themes, undo/redo, and Markdown syntax highlighting.
- Full-text search across locations via SQLite FTS5 with snippet highlighting.
- Frontmatter parsing, Markdown diagnostics, and HTML/PDF export.
- Markdown preview with resizable split view and editor↔preview scroll sync.
- Focus mode with typewriter scrolling and sentence/paragraph-level dimming.
- Syntax highlighting with real-time parts-of-speech coloring.
- Style checking via Aho-Corasick (fillers, redundancies, clichés) with diagnostics panel.
- Global Capture with system-wide shortcut (Cmd+Shift+Space) and macOS tray integration.
- Calm UI as default experience with auto-hiding chrome.
- Responsive layout with viewport-tier breakpoints and mobile-friendly Dialog.
- New document creation from sidebar and toolbar with draft path generation and recovery.
