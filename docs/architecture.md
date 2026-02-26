---
title: "Architecture"
last_updated: 2026-02-26
---

## System Overview

Writer is a desktop app with:

- Frontend: React + TypeScript (`src/`)
- Backend: Tauri command layer (`src-tauri/`) + Rust workspace crates (`crates/`)

User-selected folders (locations) are the source of truth for document files. SQLite stores metadata, indexes, and settings.

## Frontend

### Composition

- Root route is selected in `src/main.tsx` and `src/routes/AppRouter.tsx`.
- Main app UI is composed in `src/App.tsx`.
- Controller orchestration is centered in `src/hooks/controllers/useAppController.ts`.

### State

- Single Zustand store in `src/state/stores/app.ts`.
- Selector hooks in `src/state/selectors.ts` expose focused read/write APIs.
- Store slices include:
  - layout chrome
  - editor presentation
  - view mode (split/focus/preview)
  - writer tools
  - workspace (locations/documents)
  - tabs
  - PDF export
  - UI state (layout settings dialog, PDF dialog, global capture settings)

### Command Boundary

- `src/ports/` defines the frontend/backend command boundary.
- `runCmd` interprets typed commands (`Invoke`, `Batch`, watcher commands).
- Command builders centralize payload and callback shape for Tauri commands.

## Backend

### Tauri Layer

- `src-tauri/src/lib.rs` configures plugins and command handlers.
- `AppState` in `src-tauri/src/commands.rs` holds:
  - `store: Arc<Store>`
  - active filesystem watchers
- Commands cover locations, docs, search, markdown rendering, settings, session restore, and global capture.

### Rust Workspace

- `crates/core`: shared types and error contracts.
- `crates/store`: SQLite-backed persistence, indexing, save logic.
- `crates/markdown`: markdown render pipelines for preview and PDF AST.

## Rendering Pipelines

- Preview: frontend requests `markdown_render`, then renders returned HTML + metadata.
- PDF: frontend requests `markdown_render_for_pdf`, converts AST to PDF via `@react-pdf/renderer`, and writes bytes using Tauri plugins.

## Runtime Events

Backend events (`backend-event`) are consumed by `useBackendEvents` and surfaced via UI alerts for missing locations, conflicts, and reconciliation progress.
