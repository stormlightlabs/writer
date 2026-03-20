---
title: "GitHub Gist Integration"
last_updated: 2026-03-20
---

Import public gists, read personal/secret gists, and publish documents as gists.
Full spec in [docs/integration/gh.md](../integration/gh.md).

## Part 1 — Public gist browsing

1. **Backend gist module** — `src-tauri/src/github/{mod,gists}.rs` with `GithubState`, `GistRecord`
2. **Tauri commands** — `gist_list_public`, `gist_get` (no auth required)
3. **Frontend import UI** — `GistImportSheet.tsx` with username input, gist browser, preview, import to location
4. **Port + state wiring** — command wrappers in `ports/commands.ts`, `GithubUiState` in Zustand store, `useGithubUiState` selector

## Part 2 — Auth & private gists

1. **GitHub OAuth device flow** — `src-tauri/src/github/auth.rs` with `github_device_code`, `github_poll_token`
2. **Token persistence** — store access token in app data dir, restore on startup
3. **Tauri commands** — `github_session`, `github_logout`, `gist_list_personal`
4. **Auth UI** — `GithubAuthSheet.tsx` with device code display, session indicator, logout
5. **"My Gists" mode** — toggle in import sheet to browse personal + secret gists

## Part 3 — Publish & update

1. **Tauri commands** — `gist_create`, `gist_update`, `gist_delete`
2. **Publish UI** — `GistPublishSheet.tsx` with filename, description, visibility toggle, preview
3. **Origin tracking** — `gist_origin` SQLite table linking documents to gist IDs
4. **Re-publish** — detect previously published docs, surface "Update Gist" action
5. **Re-import** — compare `updated_at` to detect remote changes, prompt with diff
