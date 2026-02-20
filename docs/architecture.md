# Architecture

## Foundational Assumptions

- **Canonical storage = OS locations (folders)** + **sidecar SQLite index + JSON settings**.
- Markdown parsing/rendering is **authoritative in Rust** (single source of truth), using a spec-complete CommonMark+GFM engine (recommended: **Comrak**). ([Crates.io][comrak])
- Frontend uses **Elm architecture** with `Model/Msg/update/Cmd/Sub`.
- Rust communicates with the frontend via **Tauri commands + events**. ([Tauri][tauri-calling-rust])

## Constraints

1. **React + Tauri** desktop app.
2. **Hand-made Elm architecture** for state management (single source of truth `Model`, message-driven `update`, explicit `Cmd` effects, `Subscriptions`).
3. Storage must follow **three patterns**:
   - **Filesystem as canonical store**
   - **Sidecar metadata**
   - **Sync as transport**
4. Must use **OS "Locations"**: user picks folders via native dialogs; app persists access, and treats those folders as roots for documents.
5. Security posture: Tauri **capabilities/permissions** and filesystem scoping, not "unrestricted arbitrary fs" by default. ([Tauri][tauri-capabilities])

## Workspace Layout

- `src/` (React UI)
- `crates/core/` (`writer-core` domain types, markdown API, storage API)
- `crates/markdown/` (`writer-md` markdown engine wrapper around Comrak)
- `crates/store/` (`writer-store` SQLite + FTS)
- `src-tauri/` (`writer` Tauri app + command handlers)
- `fixtures/markdown/` — input markdown + expected HTML + expected outline metadata
- `fixtures/render/` — XSS / raw HTML testcases

## Data Model

### Canonical content (user-controlled)

- All user documents are **plain-text files** stored *in the user's chosen locations* (e.g., `~/Documents/Writing`, `~/Library/Mobile Documents/...` for iCloud Drive, Dropbox folder, etc.).
- Supported file types (MVP):

    - `.md` (Markdown)
    - `.txt` (plain text)
    - optional: `.mdx` later (non-MVP)

The app **never requires** content to live in an app-private container.

### Sidecar metadata (app-controlled)

All app-owned derived data lives in the app's application data directory (e.g., `AppData`/`Application Support` equivalent), not inside user content roots.

- `app.db` (SQLite)
    - Search index via **FTS** (FTS5 recommended)
    - Document catalog (path, file hash/mtime, size, encoding)
    - Tag index (derived from frontmatter or inline syntax)
    - "Recent documents", pin list, writing sessions stats
- `settings.json` (small, human-readable)
    - UI preferences, editor settings, enabled locations list
- `workspace.json`
    - Window layout, last open doc, sidebar state, etc.

> Tauri provides an official **Store plugin** for persisting small state to a file (async), which is appropriate for `settings/workspace` class data. ([Tauri][tauri-store])

## Frontend: Elm Loop in React

Define:

- `Model` (single immutable state tree)
- `Msg` (all possible events - TS enum)
- `update(model, msg) -> [model, Cmd[]]`
- `Cmd` (effects): invokes Rust commands, timers, file watchers subscription changes
- `subscriptions(model) -> Sub[]`:
    - file watcher events
    - debounced autosave ticks
    - OS focus/blur, window events

**Rule:** UI components are pure views of `Model`. They may *dispatch* `Msg`, but they do not perform I/O.

## Core: Rust "Ports" Layer

All filesystem and indexing operations happen in Rust commands (Tauri backend), because:

- Tauri's JS fs APIs are scoped and safe, but a Rust core gives you stronger control over:
    - atomic writes
    - canonicalization
    - watcher integration
    - cross-platform path correctness
- Tauri's security model centers on **capabilities and permissioned commands**. ([Tauri][tauri-capabilities])

### Core Commands

- `location_add_via_dialog() -> LocationDescriptor`
- `location_remove(LocationId)`
- `doc_list(LocationId, filter/sort) -> DocMeta[]`
- `doc_open(DocId) -> { text, meta }`
- `doc_save(DocId, text, policy) -> SaveResult`
- `doc_rename/move/delete`
- `index_rebuild(LocationId)`
- `search(query, options) -> SearchHit[]`
- `watch_enable(LocationId)` / `watch_disable(LocationId)` (or auto from subscriptions)

### Command Contract

- Standard response envelope:
    - `Ok(T)` / `Err(AppError { code, message, context })`
- Error codes: `NotFound`, `PermissionDenied`, `InvalidPath`, `Io`, `Parse`, `Index`, `Conflict`

## Storage Behaviors

### Writes must be atomic

- Save pipeline:

  1. write to temp file in same directory (or safe temp under location root)
  2. fsync as available
  3. rename/replace original
- Update index after successful rename/replace.
- If provider conflicts occur (e.g., Dropbox "conflicted copy"), treat as a new file and surface a conflict UI.

### File identity & change detection

Store in SQLite:

- `path`
- `location_id`
- `mtime`, `size`
- `content_hash` (fast hash; compute on open/save and optionally on watcher events)
- `doc_id` stable key = `(location_id, normalized_relative_path)`; if path changes, doc_id changes unless you implement inode/file-id based identity.

### Encoding & line endings

- Assume UTF-8 by default; detect BOM and handle losslessly.
- Preserve line endings on save unless user opts into normalization.

## Indexing & Search

### Index policy

- SQLite FTS index is **derived**:

    - It can always be rebuilt.
    - It must never be required for opening/editing a file.
- Index update triggers:

    - on save
    - on watcher "changed/created/renamed/deleted"
    - on periodic reconciliation (e.g., at app start or every N minutes per location)

### Query features

- Full-text search with snippet results
- Filters:
    - location
    - file type
    - updated range
- Sorting:
    - relevance
    - recently modified
    - filename

## Permissions & Security Model (Tauri v2)

- Use Tauri **capabilities** to enable only:
    - dialog open/save
    - fs read/write/rename/mkdir/watch (scoped)
- Leverage fs plugin scoping (glob-based) and prevent parent traversal. ([Tauri][tauri-fs])
- Persist scopes across restarts via **persisted-scope** (explicitly register after fs plugin). ([Tauri][tauri-persisted-scope])

## Defaults

- **Rust is authoritative** for Markdown → HTML, and the UI is a "viewer" of that output.
- Default profile is **GFM-safe**: rich features, but no unsafe raw HTML. ([Crates.io][comrak])
- Use Comrak **sourcepos** as the backbone for editor↔preview sync; it's explicitly supported in Comrak render options (with known limitations around lists/inlines). ([Docs.rs][comrak-render])

[comrak]: https://crates.io/crates/comrak "comrak - crates.io: Rust Package Registry"
[tauri-calling-rust]: https://v2.tauri.app/develop/calling-rust/ "Calling Rust from the Frontend"
[tauri-capabilities]: https://v2.tauri.app/security/capabilities/ "Capabilities"
[tauri-store]: https://v2.tauri.app/plugin/store/ "Store"
[tauri-persisted-scope]: https://v2.tauri.app/plugin/persisted-scope/ "Persisted Scope"
[tauri-fs]: https://v2.tauri.app/reference/javascript/fs/ "@tauri-apps/plugin-fs | Tauri"
[comrak-render]: https://docs.rs/comrak/latest/comrak/options/struct.Render.html "Render in comrak::options - Rust"
