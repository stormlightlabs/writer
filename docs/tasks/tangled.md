---
title: Tangled Strings integration
updated: 2026-03-20
---

Publish documents as [Tangled strings](https://tangled.sh) (AT Protocol gists) and import strings as documents.

## Part 1 — Auth

1. **OAuth loopback flow** - `src-tauri/src/atproto/auth.rs`
2. **Session persistence** - token + DPoP key storage in app data dir
3. **Tauri commands** - `atproto_login`, `atproto_logout`, `atproto_session_status`
4. **Frontend auth UI** - login sheet, session indicator, logout
   - User clicks `@` button in toolbar
   - If not logged in, show login sheet
   - If logged in, show session indicator (Dolly from `icons.tsx`)
   - Logout button in session indicator or in the settings menu

## Part 2 — Pull

1. **Tauri commands** - `string_list`, `string_get`
2. **Import UI** - "Import from Tangled" sheet with handle input, string browser, preview, import to location
   - Fluent Icons (`i-fluent-document-*-16-filled`)
   - Extensions covered: `py`, `md`, `js`, `ts`, `yaml`, `java`, `sass`, `css`, `csv`, `fs`, `cs`
   - `i-fluent-document-16-filled` for fallback

## Part 3 — Push

1. **Tauri commands** - `string_create`, `string_update`, `string_delete`
2. **Publish UI** - "Publish as String" action in export menu with filename, description, preview

## Part 4 — Sync & metadata

1. **Origin tracking** - AT URI, TID, source DID in SQLite
2. **Change detection** - local re-publish offers, remote drift on re-pull
