# Writer spec

## Intent

A focused writing environment that treats **user-chosen folders ("locations")** as the
canonical source of truth (plain-text/Markdown), with a **derived local index** for fast
search, and an **optional sync story** that comes "for free" via iCloud/Dropbox/OneDrive/etc
because the files live in those providers’ folders.

Persistence with "library of folders," and sidecar state *for indexes and UI state only*.

## Constraints

1. **React + Tauri** desktop app.
2. **Hand-made Elm architecture** for state management (single source of truth `Model`, message-driven `update`, explicit `Cmd` effects, `Subscriptions`).
3. Storage must follow **three patterns**:
   - **Filesystem as canonical store**
   - **Sidecar metadata**
   - **Sync as transport**
4. Must use **OS "Locations"**: user picks folders via native dialogs; app persists access, and treats those folders as roots for documents.
5. Security posture: Tauri **capabilities/permissions** and filesystem scoping, not "unrestricted arbitrary fs" by default. ([Tauri][1])

## Data model

### 2.1 Canonical content (user-controlled)

- All user documents are **plain-text files** stored *in the user’s chosen locations* (e.g., `~/Documents/Writing`, `~/Library/Mobile Documents/...` for iCloud Drive, Dropbox folder, etc.).
- Supported file types (MVP):

    - `.md` (Markdown)
    - `.txt` (plain text)
    - optional: `.mdx` later (non-MVP)

The app **never requires** content to live in an app-private container.

### 2.2 Sidecar metadata (app-controlled)

All app-owned derived data lives in the app’s application data directory (e.g., `AppData`/`Application Support` equivalent), not inside user content roots.

- `app.db` (SQLite)

    - Search index via **FTS** (FTS5 recommended)
    - Document catalog (path, file hash/mtime, size, encoding)
    - Tag index (derived from frontmatter or inline syntax)
    - "Recent documents", pin list, writing sessions stats
- `settings.json` (small, human-readable)

    - UI preferences, editor settings, enabled locations list (see §3)
- `workspace.json`

    - Window layout, last open doc, sidebar state, etc.

> Tauri provides an official **Store plugin** for persisting small state to a file (async), which is appropriate for `settings/workspace` class data. ([Tauri][2])

## Locations & Persistence

### 3.1 How "Locations" work

- Users add a location by choosing a folder via native dialog (`Open Directory…`).
- The app treats each location as a **root**; all document operations must resolve under a root (no "../../" traversal, no implicit global disk access).

Tauri’s **dialog plugin** can open file/directory selectors; selected paths are added to filesystem/asset scopes **for the running session**, but the scope change is **not persisted across restarts** unless you persist it. ([Tauri][3])

### 3.2 Persisting access in Tauri

- Use Tauri’s **persisted-scope plugin** so that filesystem/asset scopes added through dialogs (and related APIs) are restored on relaunch. ([Tauri][4])
- Use Tauri **capabilities/permissions** to grant only what you need (dialog open/save, fs read/write/watch within scope). ([Tauri][1])
- Use the **fs plugin’s scope configuration** (glob-scoped access) as a second line of defense. ([Tauri][5])

### 3.3 Platform notes

- **macOS App Sandbox / MAS**: persistent access to user-selected folders typically involves **security-scoped bookmarks**; Apple’s sandboxing docs explicitly describe using bookmarks that grant access when resolved. ([Apple Developer][6])
    - Practical spec stance: if you plan Mac App Store distribution, design the "Location persistence layer" so it *can* be backed by security-scoped bookmarks; for non-MAS builds, Tauri persisted scope may be sufficient depending on entitlements and packaging.
- **Linux (Flatpak/Snap)**: sandboxed deployments often rely on **XDG portals**; the **Document portal** exposes external files to sandboxed apps via a controlled mount (`/run/user/$UID/doc/…`). ([Flatpak][7])
- **Windows**: sandboxed models (UWP-like) preserve file-picker access using concepts like a **future-access list**; even if you’re not UWP, this is a useful conceptual model for "remembering user-granted access." ([Microsoft Learn][8])

**Key design decision:** implement a *Location Access Abstraction* so the rest of the app only deals with `LocationId -> ResolvedPathHandle`, regardless of platform-specific persistence.

## Architecture

### Frontend: Elm loop in React

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

### Core: Rust "ports" layer

All filesystem and indexing operations happen in Rust commands (Tauri backend), because:

- Tauri’s JS fs APIs are scoped and safe, but a Rust core gives you stronger control over:
    - atomic writes
    - canonicalization
    - watcher integration
    - cross-platform path correctness
- Tauri’s security model centers on **capabilities and permissioned commands**. ([Tauri][1])

**Core commands:**

- `location_add_via_dialog() -> LocationDescriptor`
- `location_remove(LocationId)`
- `doc_list(LocationId, filter/sort) -> DocMeta[]`
- `doc_open(DocId) -> { text, meta }`
- `doc_save(DocId, text, policy) -> SaveResult`
- `doc_rename/move/delete`
- `index_rebuild(LocationId)`
- `search(query, options) -> SearchHit[]`
- `watch_enable(LocationId)` / `watch_disable(LocationId)` (or auto from subscriptions)

## Storage behaviors

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

## Indexing & search

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

## Permissions & security model (Tauri v2)

- Use Tauri **capabilities** to enable only:

    - dialog open/save
    - fs read/write/rename/mkdir/watch (scoped)
- Leverage fs plugin scoping (glob-based) and prevent parent traversal. ([Tauri][5])
- Persist scopes across restarts via **persisted-scope** (explicitly register after fs plugin). ([Tauri][4])

## UX

### Library (Locations-first)

- Sidebar shows:
    - Locations (root folders)
    - Within each: folders + documents tree (optional), or flat list with filters
- "Add Location…" opens folder picker (directory selection). ([Tauri][9])

### Editor

- Split view optional (preview later; not required)
- Focus modes:
    - typewriter scroll
    - distraction-free
- Autosave:
    - default on (debounced)
    - status indicator: Saved / Saving / Error

### Search

- Global search across all locations with filters
- Search results open file at match; highlight match ranges

## Testing & verification

1. **Location persistence**
   - Add a location, restart the app, verify you can still read/write within it without re-adding. (Persisted scope must be enabled.) ([Tauri][3])
2. **Atomic save**
   - Kill the app during save; file must be either old version or new version, never partial.
3. **Index rebuild**
   - Delete `app.db`; app still opens files; search becomes available after rebuild.
4. **Scoped access enforcement**
   - Attempt to open a path outside locations; app must refuse.
5. **Cross-provider sanity**
   - Use a location under iCloud/Dropbox/OneDrive; create/edit from another device; verify watcher/reconcile updates index and surfaces conflicts.

## Parking Lot

- Cloud sync service
- Zettlekasten features/Obsidian-like graph features
- Plugin interface

## Notes

If you truly want "OS locations" in a way that survives sandboxed distribution, treat "persisted access" as a **first-class subsystem** (with platform backends):

- Tauri persisted scopes are the ergonomic default. ([Docs.rs][10])
- macOS sandboxed distribution requires planning for **security-scoped bookmarks** as the durable permission token. ([Apple Developer][6])
- Flatpak/Snap often route access through **portals/document portal**. ([Flatpak][7])

[1]: https://v2.tauri.app/security/capabilities/ "Capabilities"
[2]: https://v2.tauri.app/plugin/store/ "Store"
[3]: https://v2.tauri.app/reference/javascript/dialog/ "tauri-apps/plugin-dialog"
[4]: https://v2.tauri.app/plugin/persisted-scope/ "Persisted Scope"
[5]: https://v2.tauri.app/reference/javascript/fs/ "@tauri-apps/plugin-fs | Tauri"
[6]: https://developer.apple.com/documentation/security/accessing-files-from-the-macos-app-sandbox "Accessing files from the macOS App Sandbox"
[7]: https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.Documents.html "XDG Desktop Portal documentation"
[8]: https://learn.microsoft.com/en-us/uwp/api/windows.storage.accesscache.storageitemaccesslist?view=winrt-26100&utm_source=chatgpt.com "StorageItemAccessList Class - Windows"
[9]: https://v2.tauri.app/plugin/dialog/ "Dialog"
[10]: https://docs.rs/tauri-plugin-persisted-scope "tauri_plugin_persisted_scope - Rust"
