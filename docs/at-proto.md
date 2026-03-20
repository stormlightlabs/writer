---
title: AT Protocol Integration Spec
updated: 2026-03-19
---

## Goals

- Use [jacquard](https://docs.rs/crate/jacquard/latest) (`^0.9`) to handle AT Protocol interactions.
- AT Protocol OAuth with loopback redirect for desktop auth flow.
- Tangled string integration (publish and import documents as strings).
- Standard.Site post integration

## Tangled Strings

Strings are Tangled's equivalent of GitHub Gists — lightweight text/code snippets stored as AT Protocol records on the user's PDS under the `sh.tangled.string` collection. The Tangled AppView indexes them via Jetstream ingestion, but all CRUD goes through standard `com.atproto.repo.*` XRPC endpoints on the PDS directly — no Tangled-specific server API is needed for read/write.

### Constraints

- **Record size limit:** PDS records are capped at **2 MiB**. Large documents must be rejected with a clear error before attempting upload.
- **Filename:** 1–140 graphemes. Default to the document's current filename.
- **Description:** 0–280 graphemes. User-provided summary.
- **Contents:** min 1 grapheme. The document body (markdown or plaintext).
- **Key format:** TID (timestamp-based, base32-sortkey encoded, e.g. `3jzfcijpj2z2a`).
- **AT URI format:** `at://<did>/sh.tangled.string/<tid>`

### XRPC Endpoints

All endpoints target `/xrpc/{NSID}` on the user's PDS. Collection is always `"sh.tangled.string"`.

| Operation | Endpoint                        | Method | Auth     |
| --------- | ------------------------------- | ------ | -------- |
| Create    | `com.atproto.repo.createRecord` | POST   | Required |
| Read      | `com.atproto.repo.getRecord`    | GET    | No       |
| List      | `com.atproto.repo.listRecords`  | GET    | No       |
| Update    | `com.atproto.repo.putRecord`    | POST   | Required |
| Delete    | `com.atproto.repo.deleteRecord` | POST   | Required |
| Batch     | `com.atproto.repo.applyWrites`  | POST   | Required |

`listRecords` supports cursor-based pagination (`cursor`, `limit`, `reverse`, `rkeyStart`/`rkeyEnd`). Reading records does not require authentication — any user's public strings can be listed and fetched without a session.

### Data Flow

```text
┌──────────────┐    Tauri commands     ┌───────────────────┐
│   Frontend   │ ───────────────────── │  src-tauri/       │
│  (React/TS)  │                       │  commands.rs      │
│              │  ◄── CommandResponse  │  + atproto.rs     │
└──────────────┘                       └────────┬─────────┘
                                                │
                                       jacquard Agent<OAuthSession>
                                                │
                                       ┌────────▼─────────┐
                                       │   User's PDS     │
                                       │  (XRPC endpoints)│
                                       └──────────────────┘
                                                │
                                       Jetstream ingestion
                                                │
                                       ┌────────▼────────────┐
                                       │  Tangled AppView    │
                                       │  (tangled.sh)       │
                                       └─────────────────────┘
```

### Jacquard Usage

Jacquard (`^0.9`, ~99k downloads/month, MPL-2.0) provides generated types for the `sh.tangled.string` lexicon in `jacquard_api::sh_tangled::string`:

- `TangledString` / `TangledStringBuilder` — record type and builder.
- `TangledStringRecord` — full record with URI and CID.

Sub-crates:

| Crate               | Purpose                                                         |
| ------------------- | --------------------------------------------------------------- |
| `jacquard-common`   | Core types: DIDs, handles, AT URIs, NSIDs, TIDs, CIDs           |
| `jacquard-api`      | 646+ generated lexicon bindings (includes `sh_tangled::string`) |
| `jacquard-oauth`    | OAuth/DPoP with loopback server support                         |
| `jacquard-identity` | Handle/DID resolution, OAuth metadata discovery                 |

XRPC calls use the builder + `.send()` pattern:

```rust
use jacquard::api::com_atproto::repo::create_record::CreateRecordRequest;
use jacquard::api::sh_tangled::string::TangledString;

let record = TangledString::builder()
    .filename("notes.md")
    .description("My notes")
    .contents(body)
    .created_at(chrono::Utc::now())
    .build();

let response = CreateRecordRequest::builder()
    .repo(&session.did)
    .collection("sh.tangled.string")
    .record(record)
    .build()
    .send(&agent)
    .await?;
```

For reads (no auth needed), use a stateless `reqwest::Client` with the `XrpcExt` trait or an unauthenticated agent. For writes, the `Agent<OAuthSession>` handles DPoP headers and token refresh automatically.

Jacquard types use zero-copy deserialization via `CowStr<'_>`. Use `.parse()` for borrowed data or `.into_output()` for owned `'static` data when the response outlives the buffer.

### Backend Module Structure

```sh
src-tauri/src/
├── atproto/
│   ├── mod.rs          # re-exports shared auth types/state
│   ├── auth.rs         # OAuth loopback flow, session restore, logout cleanup
│   └── strings.rs      # Tangled string listing + fetch helpers
```

`AtProtoState` lives inside `AppState` and owns the Jacquard OAuth client plus persisted session metadata paths. The current auth slice restores an existing session during app startup, exposes the active `SessionInfo`, and clears persisted auth artifacts when restoration or logout fails.

**Tauri commands:**

| Command                  | Args                                   | Returns                                | Auth      |
| ------------------------ | -------------------------------------- | -------------------------------------- | --------- |
| `atproto_login`          | `handle: String`                       | `CommandResponse<SessionInfo>`         | Initiates |
| `atproto_logout`         | —                                      | `CommandResponse<()>`                  | Required  |
| `atproto_session_status` | —                                      | `CommandResponse<Option<SessionInfo>>` | No        |
| `string_create`          | `filename, description, contents`      | `CommandResponse<StringRecord>`        | Required  |
| `string_update`          | `tid, filename, description, contents` | `CommandResponse<StringRecord>`        | Required  |
| `string_delete`          | `tid`                                  | `CommandResponse<()>`                  | Required  |
| `string_list`            | `did_or_handle`                        | `CommandResponse<Vec<StringRecord>>`   | No        |
| `string_get`             | `did_or_handle, tid`                   | `CommandResponse<StringRecord>`        | No        |

`StringRecord` contains: `uri` (AT URI), `tid`, `filename`, `description`, `contents`, `created_at`.

### Frontend Structure

```sh
src/
├── state/stores/ui.ts         # auth/import sheet mode + hydrated/pending/session state
├── state/selectors.ts         # AT Protocol selector hooks
├── ports/commands.ts          # atproto_login / logout / session_status / string_list / string_get
├── hooks/controllers/
│   └── useAtProtoController.ts
├── components/
│   ├── AtProto/
│   │   ├── AtProtoAuthSheet.tsx   # login + session sheet
│   │   └── ImportSheet.tsx        # Tangled import browser sheet
│   └── AppLayout/LayoutSettingsPanel/
│       └── AtProtoSection.tsx
```

Auth UI is launched from the toolbar `@` button. When no session exists it opens the login sheet; when a session exists it opens the session indicator sheet. The login sheet also exposes a public "Browse Public Strings" path, and the session sheet exposes an "Import Strings" action that opens the pull browser. Logout is available from both the session sheet and the full settings panel.

The pull browser flow is:

1. Enter a handle or DID and call `string_list`.
2. Select a string and hydrate the preview with `string_get`.
3. Choose a Writer location + relative path.
4. Import with `doc_exists` guard + `doc_save`.

Imported non-Markdown/non-plaintext strings are wrapped in fenced code blocks using the source filename extension as the language tag when possible.

### Sync & Origin Tracking

When a document is published as a string or imported from one, store the association in SQLite:

- `string_origin` table: `doc_id`, `at_uri`, `tid`, `source_did`, `last_synced_at`
- On publish: insert/update origin row, store TID for future `putRecord` updates.
- On import: insert origin row linking the new document to the source string.
- Re-publish: detect local modifications to a previously published document; surface "Update String" action.
- Re-pull: compare `createdAt` or content hash to detect remote changes; prompt with diff.

Non-markdown/non-plaintext content (detected by file extension on the string's `filename`) should be wrapped in a fenced code block with the appropriate language tag on import.

---

## Standard.Site Integration

- Phased: [Leaflet](https://tangled.org/leaflet.pub/leaflet/tree/main/lexicons/pub/leaflet) → pckt → GreenGale
- [ ] Pull posts from AT Protocol `standard.site` websites.
- [ ] Push posts to AT Protocol `standard.site` websites.
- See [standard.site](https://standard.site) & [repo](https://tangled.org/standard.site/lexicons)
  ([Source](https://tangled.org/standard.site/lexicons/tree/main/src/lexicons))

### Pull Publications

- `site.standard.publication` records (we can browser by users)

## Pull Posts

- `site.standard.document` records (posts)
  - Leaflet content is `pub.leaflet.content`
    - Pages: `pub.leaflet.pages.linearDocument`

## Lexicon Reference (`sh.tangled.string`)

```json
{
  "lexicon": 1,
  "id": "sh.tangled.string",
  "needsCbor": true,
  "needsType": true,
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["filename", "description", "createdAt", "contents"],
        "properties": {
          "filename": {
            "type": "string",
            "maxGraphemes": 140,
            "minGraphemes": 1
          },
          "description": {
            "type": "string",
            "maxGraphemes": 280
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          },
          "contents": {
            "type": "string",
            "minGraphemes": 1
          }
        }
      }
    }
  }
}
```

## AT Protocol OAuth

### Desktop Loopback Flow

1. User enters handle (e.g. `alice.bsky.social`).
2. Resolve handle → DID → PDS URL → authorization server metadata.
3. Generate ES256 DPoP keypair (one per session).
4. Pushed Authorization Request (PAR) with PKCE challenge (S256) to auth server.
5. Open system browser to `authorize?client_id=...&request_uri=...`.
6. User approves; browser redirects to `http://127.0.0.1:<ephemeral-port>/callback?code=...`.
7. Exchange code for DPoP-bound access + refresh tokens.
8. Verify `sub` DID claim matches the resolved DID.
9. Use `Agent<OAuthSession>` for all subsequent XRPC calls.

Jacquard's `jacquard-oauth` crate provides `OAuthClient`, `OAuthSession`, `FileAuthStore`, and `LoopbackConfig` to handle this flow. The `loopback` feature flag (enabled by default) includes the local HTTP server.

### Token Lifecycle (Public/Native Client)

- **Access token:** ~5 min expiry, refresh silently via refresh token.
- **Refresh token:** 2-week max lifetime.
- **Session:** 2-week max, then full re-auth required.
- **DPoP nonce:** 5-min server-side lifetime, rotated via `DPoP-Nonce` response header. Jacquard handles nonce rotation internally.

### Session Persistence

Use `FileAuthStore` (or equivalent) in the app data directory alongside the SQLite DB. This persists the DPoP keypair and refresh token across app restarts so users don't need to re-authenticate on every launch. On token expiry, attempt silent refresh; on failure, clear session and prompt re-login.

### Client Metadata

For development, `client_id` can be `http://localhost`. For production, publish client metadata at an HTTPS URL containing:

- `application_type: "native"`
- `dpop_bound_access_tokens: true`
- `grant_types: ["authorization_code", "refresh_token"]`
- `scope: "atproto"`
- `redirect_uris: ["http://127.0.0.1/callback"]`

## References

- [Jacquard docs (v0.9.3)](https://docs.rs/jacquard/0.9.3/jacquard/)
- [Jacquard API: sh_tangled::string](https://docs.rs/jacquard-api/0.9.3/jacquard_api/sh_tangled/string/index.html)
- [Jacquard API: com_atproto::repo](https://docs.rs/jacquard-api/0.9.3/jacquard_api/com_atproto/repo/index.html)
- [AT Protocol: Repository spec](https://atproto.com/specs/repository)
- [AT Protocol: OAuth spec](https://atproto.com/specs/oauth)
- [AT Protocol: XRPC spec](https://atproto.com/specs/xrpc)
- [AT Protocol: Record keys](https://atproto.com/specs/record-key)
- [Tangled core repo](https://tangled.org/tangled.org/core)
- [Tangled string lexicon source](https://tangled.org/tangled.org/core/blob/master/lexicons/string/string.json)
- [Tangled blog: 6 months](https://blog.tangled.org/6-months)
