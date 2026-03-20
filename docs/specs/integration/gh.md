---
title: GitHub Gist Integration Spec
updated: 2026-03-19
---

## Goals

- Browse and import public gists from any GitHub user.
- Authenticate via GitHub OAuth device flow to access private gists.
- Publish documents as new gists (public or secret) and update existing ones.
- Follow the same architectural patterns as the AT Protocol / Tangled integration.

## GitHub Gist API

All endpoints use `https://api.github.com`. Gists are lightweight multi-file snippets. We treat each gist as a single document, using the first file when a gist contains multiple files.

### Relevant Endpoints

| Operation     | Endpoint                  | Method | Auth       |
| ------------- | ------------------------- | ------ | ---------- |
| List public   | `/users/{username}/gists` | GET    | No         |
| List personal | `/gists`                  | GET    | Required   |
| Get           | `/gists/{gist_id}`        | GET    | Optional\* |
| Create        | `/gists`                  | POST   | Required   |
| Update        | `/gists/{gist_id}`        | PATCH  | Required   |
| Delete        | `/gists/{gist_id}`        | DELETE | Required   |
| List starred  | `/gists/starred`          | GET    | Required   |

\* Auth optional for public gists; required for secret gists owned by the user.

Pagination: `per_page` (max 100), `page`, plus `Link` header with `rel="next"`.

Rate limits: 60 req/hr unauthenticated, 5 000 req/hr with token.

### Gist Record Shape

```json
{
  "id": "aa5a315d61ae9438b18d",
  "description": "Example gist",
  "public": true,
  "html_url": "https://gist.github.com/...",
  "files": {
    "hello.md": {
      "filename": "hello.md",
      "type": "text/markdown",
      "language": "Markdown",
      "size": 1234,
      "content": "..."
    }
  },
  "owner": { "login": "octocat", "avatar_url": "..." },
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-15T12:00:00Z"
}
```

Note: `GET /users/{username}/gists` returns truncated gist objects (no `content` in files). A follow-up `GET /gists/{gist_id}` is needed to fetch full file contents.

## Authentication

### GitHub OAuth Device Flow

The device flow is ideal for desktop/CLI apps — no loopback server or redirect URI needed.

1. `POST https://github.com/login/device/code` with `client_id` and `scope=gist`.
2. Response includes `device_code`, `user_code`, and `verification_uri`.
3. Display `user_code` to the user and open `verification_uri` in the system browser.
4. Poll `POST https://github.com/login/oauth/access_token` with `device_code` + `client_id` until the user authorizes (respect `interval` from step 2).
5. Receive `access_token` (no refresh token for device flow; token does not expire unless revoked).

### Token Lifecycle

- **Access token:** Does not expire. Valid until the user revokes it in GitHub settings.
- **Scope:** `gist` — read/write access to gists only.
- **Storage:** Persist token in app data directory (`github-token.json`). Encrypt at rest via Tauri's platform keychain integration if available, otherwise store as plaintext JSON alongside other session files.

### Client Registration

Register a GitHub OAuth App at `https://github.com/settings/developers`:

- Enable "Device flow" in the app settings.
- No callback URL required for device flow.
- `client_id` is public (no client secret needed for device flow).

## Data Flow

```text
┌──────────────┐    Tauri commands     ┌───────────────────┐
│   Frontend   │ ───────────────────── │  src-tauri/       │
│  (React/TS)  │                       │  commands.rs      │
│              │  ◄── CommandResponse  │  + github.rs      │
└──────────────┘                       └────────┬──────────┘
                                                │
                                       reqwest + token auth
                                                │
                                       ┌────────▼──────────┐
                                       │  api.github.com   │
                                       │  (REST API v3)    │
                                       └───────────────────┘
```

## Backend Module Structure

```sh
src-tauri/src/
├── github/
│   ├── mod.rs          # re-exports GithubState, GithubSession, GistRecord
│   ├── auth.rs         # device flow, token persistence, logout
│   └── gists.rs        # list, get, create, update, delete helpers
```

### Types

```rust
pub struct GithubState {
    client: reqwest::Client,
    token: RwLock<Option<String>>,
    token_path: PathBuf,
    username: RwLock<Option<String>>,
}

pub struct GithubSession {
    pub username: String,
    pub avatar_url: String,
    pub token_scope: String,
}

pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub interval: u64,
    pub expires_in: u64,
}

pub struct GistRecord {
    pub id: String,
    pub filename: String,
    pub description: String,
    pub contents: String,
    pub language: Option<String>,
    pub public: bool,
    pub html_url: String,
    pub owner: String,
    pub created_at: String,
    pub updated_at: String,
}
```

### Tauri Commands

| Command              | Args                                       | Returns                                  | Auth     |
| -------------------- | ------------------------------------------ | ---------------------------------------- | -------- |
| `github_device_code` | —                                          | `CommandResponse<DeviceCodeResponse>`    | No       |
| `github_poll_token`  | `device_code: String`                      | `CommandResponse<GithubSession>`         | No       |
| `github_logout`      | —                                          | `CommandResponse<()>`                    | Required |
| `github_session`     | —                                          | `CommandResponse<Option<GithubSession>>` | No       |
| `gist_list_public`   | `username: String`                         | `CommandResponse<Vec<GistRecord>>`       | No       |
| `gist_list_personal` | —                                          | `CommandResponse<Vec<GistRecord>>`       | Required |
| `gist_get`           | `gist_id: String`                          | `CommandResponse<GistRecord>`            | Optional |
| `gist_create`        | `filename, description, contents, public`  | `CommandResponse<GistRecord>`            | Required |
| `gist_update`        | `gist_id, filename, description, contents` | `CommandResponse<GistRecord>`            | Required |
| `gist_delete`        | `gist_id: String`                          | `CommandResponse<()>`                    | Required |

The two-step device flow (`github_device_code` → `github_poll_token`) lets the frontend control the polling UI. `github_poll_token` blocks server-side (with timeout) so the frontend doesn't need to manage polling intervals.

## Frontend Structure

```sh
src/
├── state/stores/ui.ts         # github sheet mode + session state
├── state/selectors.ts         # useGithubUiState() selector hook
├── ports/commands.ts          # github_* and gist_* command wrappers
├── hooks/controllers/
│   └── useGithubController.ts
├── components/
│   ├── Github/
│   │   ├── GithubAuthSheet.tsx    # device flow + session sheet
│   │   ├── GistImportSheet.tsx    # public/private gist browser
│   │   └── GistPublishSheet.tsx   # publish/update gist form
│   └── AppLayout/LayoutSettingsPanel/
│       └── GithubSection.tsx
```

### UI State

```typescript
type GithubSheetMode = "closed" | "login" | "session" | "import" | "publish";

type GithubUiState = {
  githubSheetMode: GithubSheetMode;
  githubSession: GithubSession | null;
  githubHydrated: boolean;
  githubPending: boolean;
};
```

### Auth Flow UI

1. User clicks GitHub button in toolbar.
2. If no session → open login sheet.
3. Call `github_device_code` → display `user_code` with a "Copy" button and open `verification_uri` in browser.
4. Call `github_poll_token` (awaits backend polling).
5. On success → transition to session sheet showing `username` and avatar.
6. If session exists → show session sheet with Import / Publish / Logout actions.

### Import Flow UI

Same two-column layout as Tangled ImportSheet:

1. **Username input** — enter a GitHub username and browse public gists (no auth required).
2. **"My Gists" toggle** — when authenticated, switch to personal gist list (includes secret gists).
3. **Gist list** — clickable rows with file icon, filename, description, visibility badge, date.
4. **Preview pane** — selected gist content with syntax highlighting.
5. **Destination** — location dropdown + relative path input.
6. **Import** — `doc_exists` guard + `doc_save`.

Non-markdown/non-plaintext gist content is wrapped in a fenced code block with the language tag from the gist's `language` field.

### Publish Flow UI

1. **Filename** — defaults to current document filename.
2. **Description** — user-provided summary.
3. **Visibility** — public or secret toggle (default: secret).
4. **Preview** — document content preview.
5. **Publish** — call `gist_create`, store origin for future updates.
6. **Update** — if origin exists, offer "Update Gist" instead of "Publish".

## Sync & Origin Tracking

When a document is published as a gist or imported from one, store the association in SQLite:

- `gist_origin` table: `doc_id`, `gist_id`, `source_username`, `public`, `last_synced_at`, `remote_updated_at`.
- On publish: insert/update origin row, store `gist_id` for future `PATCH` updates.
- On import: insert origin row linking the new document to the source gist.
- Re-publish: detect local modifications to a previously published document; surface "Update Gist" action.
- Re-import: compare `updated_at` timestamp to detect remote changes; prompt with diff.

## Constraints

- **Rate limits:** Surface remaining rate limit info from `X-RateLimit-Remaining` header. Warn the user when approaching the limit. Unauthenticated browsing is limited to 60 req/hr — encourage auth for heavy use.
- **Gist size:** GitHub gists have a 10 MB size limit per file and 300 files per gist. Reject oversized documents with a clear error before upload.
- **Multi-file gists:** For import, use the first file in the gist. For publish, create single-file gists. Display file count badge on multi-file gists in the browser.
- **Truncated content:** The list endpoint returns truncated file content (first 1 MB). Always fetch the full gist via `GET /gists/{id}` before import.
- **Secret vs private:** GitHub calls them "secret" gists (accessible via URL but not listed publicly). Use "secret" in API calls but display as "Private" in the UI for clarity.

## References

- [GitHub Gist REST API](https://docs.github.com/en/rest/gists)
- [GitHub OAuth Device Flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow)
- [GitHub Rate Limiting](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
