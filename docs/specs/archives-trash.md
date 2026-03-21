---
title: Archives & Trash Spec
updated: 2026-03-21
---


> Goal: Replace permanent deletion with a recoverable trash flow and add an archive mechanism for decluttering without destroying.

## Problem

All deletions are permanent and immediate — `std::fs::remove_file` / `remove_dir_all` with no confirmation, no undo, no recovery. One misclick loses work forever. There is also no way to "shelve" documents without deleting them.

## Design

### Two Concepts

1. **Archive** — User-initiated. Moves a document out of the active sidebar into a separate "Archive" section. The file stays on disk in its original location. Reversible.
2. **Trash** — Triggered by "Delete". Soft-deletes the document. File moves to a `.writer-trash/` directory. Auto-purged after 30 days. Reversible within the retention window.

### Database Schema Changes

Extend the `documents` table:

```sql
ALTER TABLE documents ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
-- status: 'active' | 'archived' | 'trashed'

ALTER TABLE documents ADD COLUMN status_changed_at TEXT;
-- ISO 8601 timestamp of last status change
```

No new tables. The `status` column filters what appears in the sidebar.

### Rust Model Changes

In `crates/core/src/lib.rs`:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DocStatus {
    Active,
    Archived,
    Trashed,
}

pub struct DocMeta {
    // ... existing fields ...
    pub status: DocStatus,
    pub status_changed_at: Option<DateTime<Utc>>,
}
```

### Trash Storage

```sh
<location_root>/
  .writer-trash/
    <original-rel-path-urlencoded>__<timestamp>.md
```

- When trashed, the file is **moved** from its original path into `.writer-trash/`.
- The filename encodes the original relative path (URL-encoded to flatten subdirs) and a timestamp for uniqueness.
- The SQLite index retains the row with `status = 'trashed'` and the original `rel_path` for restore.

### Tauri Commands

#### `doc_archive`

```rust
#[tauri::command]
pub fn doc_archive(location_id: LocationId, rel_path: PathBuf) -> Result<bool, Error>
```

- Sets `status = 'archived'`, `status_changed_at = now()` in the index.
- File stays on disk, untouched.

#### `doc_unarchive`

```rust
#[tauri::command]
pub fn doc_unarchive(location_id: LocationId, rel_path: PathBuf) -> Result<bool, Error>
```

- Sets `status = 'active'`, clears `status_changed_at`.

#### `doc_trash`

```rust
#[tauri::command]
pub fn doc_trash(location_id: LocationId, rel_path: PathBuf) -> Result<bool, Error>
```

- Moves file from original path → `.writer-trash/`.
- Updates index: `status = 'trashed'`, `status_changed_at = now()`.

#### `doc_restore`

```rust
#[tauri::command]
pub fn doc_restore(location_id: LocationId, rel_path: PathBuf) -> Result<bool, Error>
```

- Moves file from `.writer-trash/` back to original path.
- If original path is occupied (name collision), appends `(restored)` before the extension.
- Updates index: `status = 'active'`, clears `status_changed_at`.

#### `doc_delete` (modified)

Existing `doc_delete` becomes **permanent delete from trash only**:

```rust
#[tauri::command]
pub fn doc_delete(location_id: LocationId, rel_path: PathBuf) -> Result<bool, Error>
```

- Only operates on documents with `status = 'trashed'`.
- Removes file from `.writer-trash/` and deletes the index row.
- Refuses to permanently delete `active` or `archived` documents — they must be trashed first.

#### `trash_empty`

```rust
#[tauri::command]
pub fn trash_empty(location_id: LocationId) -> Result<u32, Error>
```

- Permanently deletes all trashed documents in the location.
- Returns count of deleted documents.

#### `trash_auto_purge` (internal)

- Called on app startup and periodically (e.g., every hour via a Tauri async task).
- Permanently deletes any trashed document where `status_changed_at` is older than 30 days.
- Not exposed as a user-facing command.

### Directory Handling

For `dir_delete`:

- Trash all documents inside the directory individually (so each can be restored).
- Remove the now-empty directory from disk.
- If the directory contains subdirectories, recurse.

For `dir_archive`:

- Archive all documents inside the directory.
- Directory remains on disk.

### Frontend

#### Sidebar Sections

The sidebar file tree filters by `status`:

- **Active documents** — the default tree (current behavior, unchanged).
- **Archive section** — collapsed by default, shows archived documents. Click to view, right-click to unarchive.
- **Trash section** — collapsed by default, shows trashed documents with "Restore" and "Delete Permanently" actions. Shows time remaining before auto-purge.

#### Context Menu Updates

| Action | Current Behavior | New Behavior                            |
| ------ | ---------------- | --------------------------------------- |
| Delete | Permanent delete | Move to trash                           |
| —      | —                | Archive (new)                           |
| —      | —                | Restore (in trash/archive views)        |
| —      | —                | Delete Permanently (in trash view only) |
| —      | —                | Empty Trash (trash section header)      |

#### State

Add to the app store:

```typescript
// Selectors filter by status
useActiveDocuments(); // status === 'active'
useArchivedDocuments(); // status === 'archived'
useTrashedDocuments(); // status === 'trashed'
```

The existing document list selectors must filter to `active` only, so archived/trashed documents don't appear in the main tree.

#### Confirmation Dialog

- **Trash**: No confirmation needed (recoverable).
- **Archive**: No confirmation needed (reversible).
- **Empty Trash / Permanent Delete**: Confirmation dialog required ("This cannot be undone").

### Indexing & Sync

When the file watcher detects changes:

- If a file reappears at a previously trashed path (e.g., user manually moved it back), update status to `active`.
- If a trashed file disappears from `.writer-trash/` (e.g., user manually deleted it), remove the index row.

---

## Scope Boundaries

**In scope:**

- Soft delete (trash) with 30-day auto-purge
- Archive/unarchive
- Restore from trash
- Permanent delete from trash only
- Sidebar sections for archive and trash
- Context menu actions
- Auto-purge on startup

**Out of scope (future):**

- Undo toast ("Document trashed — Undo") with immediate restore
- Trash/archive for directories as first-class entities
- Trash across locations (each location has its own `.writer-trash/`)
- Version history / snapshots
- Cloud sync of trash state
