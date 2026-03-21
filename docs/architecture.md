---
title: "Architecture"
last_updated: 2026-03-21
---

## System Overview

Writer is a desktop app with:

- Frontend: React + TypeScript (`src/`)
- Backend: Tauri command layer (`src-tauri/`) + Rust workspace crates (`crates/`)

User-selected folders (locations) are the source of truth for document files. SQLite stores metadata, indexes, and settings.

## Frontend

### Composition

- Bootstrap happens in `src/main.tsx`.
- Routing lives in `src/Router.tsx`.
- The main window shell is `src/App.tsx`.
- The quick capture window is `src/components/QuickCapture/QuickCaptureApp.tsx`.

### Controller Layer

Frontend orchestration is split across focused hooks rather than a single app controller:

- `src/hooks/controllers/useAppChromeController.ts`
  - window chrome state such as theme and sidebar visibility
- `src/hooks/controllers/useWorkspaceViewController.ts`
  - workspace sync
  - session restore
  - editor state
  - preview state
  - export dialog wiring
  - diagnostics/help sheet routing
- `src/hooks/controllers/useWorkspaceController.ts`
  - locations, documents, tabs, sidebar refresh, file operations
- `src/hooks/app/useSettingsSync.ts`
  - backend settings hydration and persistence
  - sidebar tree hydration/persistence through sqlite-backed kv state

### State

- Runtime state is split across multiple Zustand stores under `src/state/stores/`.
- `src/state/selectors.ts` exposes focused hooks so presentational components do not bind directly to raw store modules.
- Current store modules are:
  - `layout`
  - `workspace`
  - `tabs`
  - `pdf-export`
  - `text-export`
  - `docx-export`
  - `search`
  - `ui`
  - `shortcuts`
  - `toasts`
- `src/state/stores/app.ts` is now a merged convenience facade used where a combined app shape is helpful, especially in tests and compatibility code.

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
- DOCX: frontend requests `markdown_render_for_docx`, then writes returned bytes via Tauri plugins.
- Plaintext: frontend requests `markdown_render_for_text`, then writes plain text bytes via Tauri plugins.

## Runtime Events

Backend events (`backend-event`) are consumed by `useBackendEvents`.

Primary consumers:

- `useWorkspaceSync` for location refresh and filesystem change reactions
- `BackendAlerts` for surfaced UI warnings such as missing locations and conflicts
