---
title: "Persistence"
last_updated: 2026-02-23
---


## Tauri

- Persistence is backend-owned; the frontend does not use Zustand/Jotai persistence middleware.
- The Tauri app initializes:
- `tauri_plugin_persisted_scope` for restoring previously granted filesystem access.
- `writer_store::Store::open_default()` for durable app data.
- The frontend reads/writes persisted settings through commands (`ui_layout_get/set`, `style_check_get/set`) in `src/App.tsx`.

### SQLite

- Database file: `dirs::data_dir()/org.stormlightlabs.writer/app.db` (`crates/store/src/lib.rs`).
- Core tables:
- `locations`: user-added roots (`name`, `root_path`, `added_at`).
- `documents`: indexed metadata per document (`location_id + rel_path` primary key).
- `docs_fts`: FTS5 index for full-text search.
- `app_settings`: JSON blobs for app-level settings (`ui_layout`, `style_check`).
- Lifecycle behavior:
  - Startup reconciliation validates locations, reindexes documents, and emits backend events for missing paths.
  - Document saves update filesystem content and refresh catalog/FTS entries.

### File System

- Source-of-truth document content lives in user-selected folders ("locations"), not in SQLite.
- Adding a location uses a native folder dialog; the path is:
  - persisted in `locations` table,
  - allowed in Tauri fs scope (`allow_directory`),
  - then indexed for metadata/search.
- File writes use atomic save semantics by default (`tempfile` + fsync + rename) to reduce corruption risk.
- File watchers (`watch_enable/disable`) keep the index fresh when files change outside the app.
- Important boundary:
  - SQLite stores metadata/settings/indexes.
  - The filesystem stores the actual document bytes.
