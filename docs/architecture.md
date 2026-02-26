---
title: "Architecture"
last_updated: 2026-02-23
---

## System Overview

Writer is a React + Tauri desktop app with a clear split:

- Frontend (`src/`): UI composition, editor interactions, and client state.
- Backend (`src-tauri/` + Rust crates): filesystem access, indexing/search, markdown rendering, and persisted settings.

Canonical content lives in user-selected folders ("locations"). The app database stores derived metadata, search indexes, and app settings.

## Frontend Architecture

### State Layers

- Zustand (`src/state/stores/app.ts`) is the primary app store:
  - layout/editor presentation state
  - workspace state (locations, docs, selection)
  - tabs and PDF export status
- Jotai (`src/state/atoms/search.ts` and `src/state/atoms/ui.ts`) is used for localized UI orchestration state.

### Command Boundary (`ports`)

`src/ports.ts` defines a typed command model (`Cmd`) and command builders (`locationList`, `docOpen`, `searchDocuments`, `renderMarkdownForPdf`, etc.).

Runtime flow:

1. UI/hook emits command
2. `runCmd` invokes Tauri command or watcher action
3. result/event is normalized
4. Zustand/Jotai state is updated

Hooks such as `useWorkspaceSync`, `useWorkspaceController`, and `useSearchController` orchestrate this flow.

## Backend Architecture

### App State and Commands

Tauri manages an `AppState` (`src-tauri/src/commands.rs`) containing:

- `store: Arc<Store>` (SQLite-backed domain store)
- `watchers: Mutex<HashMap<i64, RecommendedWatcher>>` (per-location filesystem watchers)

Command surface includes:

- locations: `location_add_via_dialog`, `location_list`, `location_remove`, `location_validate`
- documents: `doc_list`, `doc_open`, `doc_save`, `doc_exists`
- watchers: `watch_enable`, `watch_disable`
- search/render/settings: `search`, `markdown_render`, `markdown_render_for_pdf`, `ui_layout_get/set`, `style_check_get/set`

### Rust Crates

- `crates/core`: shared domain types and error contracts
- `crates/store`: SQLite schema, location/doc catalog, FTS, settings persistence, atomic save
- `crates/markdown`: markdown rendering for preview and PDF AST extraction

## Storage and Persistence

### Filesystem (Source of Truth)

User documents are read/written under selected locations. Saves are atomic by default (`tempfile` + fsync + rename).

### SQLite (Derived and Settings)

`crates/store` stores data in `app.db` under the app data directory (`org.stormlightlabs.writer`).

Key tables:

- `locations`
- `documents`
- `docs_fts` (FTS5)
- `app_settings` (`ui_layout`, `style_check` JSON blobs)

### Access and Scope

On startup, Tauri initializes `tauri_plugin_fs`, `tauri_plugin_dialog`, and
`tauri_plugin_persisted_scope` to support scoped filesystem operations and persisted access grants.

## Rendering Pipelines

### Editor Preview

- Frontend requests `markdown_render`.
- Rust returns HTML + metadata.
- Preview uses `data-sourcepos` mappings for editor/preview sync.

### PDF Export

- Frontend requests `markdown_render_for_pdf`.
- Rust returns a simplified PDF AST (`PdfRenderResult`).
- Frontend renders PDF with `@react-pdf/renderer` and writes bytes via Tauri file APIs.
- Font pipeline attempts custom bundled fonts first, then falls back to built-in fonts when needed.

## Writer NLP Features

Current NLP/writing-assist features are frontend-first:

- Style Check: rule-based pattern matching (Aho-Corasick) over filler/redundancy/cliche dictionaries + custom patterns.
- POS Highlighting: viewport-scoped token tagging via `wink-nlp`.

Style-check settings are persisted (`style_check_get/set` + SQLite `app_settings`), while POS highlighting is currently session state.

## Runtime Lifecycle

See [`docs/lifecycle.md`](./lifecycle.md) for the canonical startup/runtime lifecycle.
