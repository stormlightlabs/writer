---
title: Archives & Trash
updated: 2026-03-21
---

## Phase 1: Database & Model

- [ ] Add `status` and `status_changed_at` columns to `documents` table
  - Migration: `ALTER TABLE documents ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`
  - Migration: `ALTER TABLE documents ADD COLUMN status_changed_at TEXT`
- [ ] Add `DocStatus` enum to `crates/core/src/lib.rs`
  - `Active`, `Archived`, `Trashed`
- [ ] Extend `DocMeta` struct with `status: DocStatus` and `status_changed_at: Option<DateTime<Utc>>`
- [ ] Update all queries that list/fetch documents to include `status` field
  - Default sidebar queries filter to `status = 'active'`
- [ ] Add `.writer-trash/` directory creation on location init

## Phase 2: Tauri Commands (Archive)

- [ ] Implement `doc_archive` command
  - Set `status = 'archived'`, `status_changed_at = now()` in index
  - File stays on disk
- [ ] Implement `doc_unarchive` command
  - Set `status = 'active'`, clear `status_changed_at`
- [ ] Implement `dir_archive` command
  - Archive all documents inside directory recursively

## Phase 3: Tauri Commands (Trash)

- [ ] Implement `doc_trash` command
  - Move file to `.writer-trash/<encoded-path>__<timestamp>.md`
  - Update index: `status = 'trashed'`, `status_changed_at = now()`
- [ ] Implement `doc_restore` command
  - Move file from `.writer-trash/` back to original path
  - Handle name collisions (append `(restored)`)
  - Update index: `status = 'active'`
- [ ] Modify existing `doc_delete` to only operate on trashed documents
  - Refuse to permanently delete `active` or `archived` docs
  - Remove file from `.writer-trash/` and delete index row
- [ ] Implement `trash_empty` command
  - Permanently delete all trashed documents in a location
  - Return count
- [ ] Implement auto-purge on startup
  - Delete trashed documents older than 30 days
  - Run as async Tauri task, also periodically (hourly)
- [ ] Update `dir_delete` to trash all child documents individually, then remove empty directory

## Frontend Ports & State

- [ ] Add command builders in `src/ports/commands.ts`
  - `docArchive`, `docUnarchive`, `docTrash`, `docRestore`, `trashEmpty`
- [ ] Add selectors in `src/state/selectors.ts`
  - `useActiveDocuments()` — filters `status === 'active'`
  - `useArchivedDocuments()` — filters `status === 'archived'`
  - `useTrashedDocuments()` — filters `status === 'trashed'`
- [ ] Update existing document list selectors to filter `active` only
- [ ] Extend workspace controller with archive/trash actions

## Sidebar UI

- [ ] Add "Archive" section to sidebar
  - Collapsed by default, shows archived documents
  - Right-click → Unarchive
- [ ] Add "Trash" section to sidebar
  - Collapsed by default, shows trashed documents
  - Shows days remaining before auto-purge per item
  - Right-click → Restore, Delete Permanently
  - Section header → Empty Trash action
- [ ] Update context menu on active documents
  - Replace "Delete" with "Move to Trash"
  - Add "Archive" option
- [ ] Add confirmation dialog for permanent delete and empty trash
  - "This cannot be undone" messaging

## File Watcher Sync

- [ ] If a file reappears at a previously trashed path, update status to `active`
- [ ] If a trashed file disappears from `.writer-trash/`, remove index row
- [ ] Exclude `.writer-trash/` from normal document indexing

## Test Plan

- [ ] Test archive → unarchive round-trip
- [ ] Test trash → restore round-trip
- [ ] Test trash → permanent delete
- [ ] Test empty trash
- [ ] Test auto-purge (mock time or short retention for test)
- [ ] Test name collision on restore
- [ ] Test directory trash (all children trashed individually)
- [ ] Test file watcher sync scenarios
