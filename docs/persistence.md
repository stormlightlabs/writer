---
title: "Persistence"
last_updated: 2026-02-26
---

## Source of Truth

Document bytes live on disk inside user-selected locations.

SQLite stores derived/indexed data and app settings.

## Backend Persistence

Persistence is backend-owned (`crates/store` and `src-tauri` commands).

Frontend persists settings through Tauri commands rather than local browser persistence middleware.

## SQLite Data

Store location: app data directory under app identifier `org.stormlightlabs.writer`.

Key persisted domains:

- locations
- indexed document metadata
- search index data
- app settings (UI layout, style check, global capture)
- session restore metadata (last opened document)

## Filesystem Access Scope

Tauri uses dialog + fs plugins plus persisted scope support.

When locations are added, access is scoped and persisted to support reopening and syncing in future launches.

## Save Strategy

Document saves are backend-handled and designed to be safe under partial failures. Index refresh and sidebar refresh follow save completion.
