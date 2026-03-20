---
title: "Roadmap"
last_updated: 2026-03-19
---

## Tangled string integration

Publish documents as [Tangled strings](https://tangled.sh) (AT Protocol gists) and import strings as documents.

### Part 1 — Auth

1. **OAuth loopback flow** - `src-tauri/src/atproto/auth.rs`
2. **Session persistence** - token + DPoP key storage in app data dir
3. **Tauri commands** - `atproto_login`, `atproto_logout`, `atproto_session_status`
4. **Frontend auth UI** - login sheet, session indicator, logout
   - User clicks `@` button in toolbar
   - If not logged in, show login sheet
   - If logged in, show session indicator (Dolly from `icons.tsx`)
   - Logout button in session indicator or in the settings menu

### Part 2 — Pull

1. **Tauri commands** - `string_list`, `string_get`
2. **Import UI** - "Import from Tangled" sheet with handle input, string browser, preview, import to location
   - Fluent Icons (`i-fluent-document-*-16-filled`)
   - Extensions covered: `py`, `md`, `js`, `ts`, `yaml`, `java`, `sass`, `css`, `csv`, `fs`, `cs`
   - `i-fluent-document-16-filled` for fallback

### Part 3 — Push

1. **Tauri commands** - `string_create`, `string_update`, `string_delete`
2. **Publish UI** - "Publish as String" action in export menu with filename, description, preview

### Part 4 — Sync & metadata

1. **Origin tracking** - AT URI, TID, source DID in SQLite
2. **Change detection** - local re-publish offers, remote drift on re-pull

## Content blocks (transclusion)

Allow embedding external Markdown files, images, and CSV data into a master document using `/filename` syntax, as well as drag-and-drop of files into the editor.

### Tasks

1. **Syntax definition**
   - `/path/to/file.md` on its own line = transclude that file's rendered content
   - `/path/to/image.png` = embed image
   - `/path/to/data.csv` = render as Markdown table
   - Resolve paths relative to the current document's directory, scoped within its location
2. **Rust expansion command**
   - `content_block_expand(doc_ref, block_ref) -> ExpandedBlock { kind, content }`
   - Recursion guard: cap depth, detect cycles
3. **Editor integration**
   - CodeMirror decoration: render content blocks inline as collapsed/expandable previews
   - Syntax highlighting for the `/filename` token
4. **Preview + export**
   - Expand content blocks during `markdown_render` for preview
   - Expand during PDF/HTML export so final output is self-contained
5. **CSV → table rendering**
   - Parse CSV, emit GFM table Markdown, feed into Comrak pipeline

## Library enhancements (hashtags, smart folders, favorites)

Improve file organization

### Tasks

1. **Hashtag extraction**
   - Scan document text for `#tag` patterns (exclude Markdown headings)
   - Store extracted tags in the SQLite index (`doc_tags` table)
   - Re-index tags on save and on watcher events
2. **Task list extraction**
   - Scan document for `- [ ]` patterns
   - Store extracted tasks in the SQLite index (`doc_tasks` table)
   - Re-index tasks on save and on watcher events
3. **Smart folders**
   - Predefined filter rules: tag match, date range, word-count threshold, location
   - `smart_folder_list() -> Vec<SmartFolder>`, `smart_folder_query(id) -> Vec<DocMeta>`
   - UI: render smart folders in the sidebar above/below locations
4. **Favorites**
   - Toggle-favorite on any document (`doc_set_favorite(doc_ref, bool)`)
   - Persist in SQLite; surface a "Favorites" virtual folder in the sidebar
5. **Sidebar UI updates**
   - New sections for Smart Folders and Favorites
   - Badge counts on each smart folder / favorites section
   - Drag-and-drop reorder for smart folders

## Hardening

### Tasks

1. **Outline utilization**
   - Use Rust-generated `metadata.outline` from `markdown_render` in the UI for document structure navigation/jump-to-heading behavior
2. **Perf**
   - Incremental render scheduling (debounce, worker thread)
   - Indexing in background with progress events with UI feedback
3. **Recovery**
   - Corrupt settings/workspace → app resets safely
   - Missing location root → UI prompts to relink/remove

## Standard.Site Pubs & Posts

## GitHub Gist integration

Import public gists, read personal/secret gists, and publish documents as gists.
Full spec in [docs/integration/gh.md](../integration/gh.md).

### Part 1 — Public gist browsing

1. **Backend gist module** — `src-tauri/src/github/{mod,gists}.rs` with `GithubState`, `GistRecord`
2. **Tauri commands** — `gist_list_public`, `gist_get` (no auth required)
3. **Frontend import UI** — `GistImportSheet.tsx` with username input, gist browser, preview, import to location
4. **Port + state wiring** — command wrappers in `ports/commands.ts`, `GithubUiState` in Zustand store, `useGithubUiState` selector

### Part 2 — Auth & private gists

1. **GitHub OAuth device flow** — `src-tauri/src/github/auth.rs` with `github_device_code`, `github_poll_token`
2. **Token persistence** — store access token in app data dir, restore on startup
3. **Tauri commands** — `github_session`, `github_logout`, `gist_list_personal`
4. **Auth UI** — `GithubAuthSheet.tsx` with device code display, session indicator, logout
5. **"My Gists" mode** — toggle in import sheet to browse personal + secret gists

### Part 3 — Publish & update

1. **Tauri commands** — `gist_create`, `gist_update`, `gist_delete`
2. **Publish UI** — `GistPublishSheet.tsx` with filename, description, visibility toggle, preview
3. **Origin tracking** — `gist_origin` SQLite table linking documents to gist IDs
4. **Re-publish** — detect previously published docs, surface "Update Gist" action
5. **Re-import** — compare `updated_at` to detect remote changes, prompt with diff
