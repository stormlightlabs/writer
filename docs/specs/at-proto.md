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
crates/core/src/
├── atproto/
│   ├── mod.rs          # shared AT Protocol exports
│   ├── auth.rs         # OAuth loopback flow, session restore, logout cleanup
│   └── strings.rs      # Tangled string listing + fetch helpers
src-tauri/src/
├── commands/
│   ├── atproto.rs      # Tauri command wrappers for auth/session
│   └── strings.rs      # Tauri command wrappers for string CRUD
```

`writer_core::atproto::AtProtoState` owns the Jacquard OAuth client plus persisted session metadata paths. Tauri keeps an `Arc<AtProtoState>` inside `AppState`, restores the existing session during app startup, and exposes the shared `SessionInfo` / `StringRecord` types from `writer_core::atproto`.

**Tauri command boundary:**

The commands remain in `src-tauri`, but they are thin wrappers around `writer_core::atproto` methods and types:

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

Pull and push long-form posts from/to AT Protocol publishing platforms that implement the [Standard.Site](https://standard.site) shared lexicons. The `site.standard.*` schemas are format-agnostic — each platform (Leaflet, pckt, GreenGale, etc.) fills the open `content` union with its own block model. Writer converts between these block formats and Markdown on import/export.

Jacquard provides generated bindings for both Standard.Site and Leaflet lexicons behind feature flags:

```toml
jacquard-api = { version = "0.9", features = ["pub_leaflet", "site_standard"] }
```

- `jacquard_api::site_standard::{publication, document, theme, graph}` — publication/document record types + builders
- `jacquard_api::pub_leaflet::{document, publication, blocks, pages, richtext, comment, graph}` — full Leaflet content model with block types, facets, and page layouts
- Phased platform support: [Leaflet](https://tangled.org/leaflet.pub/leaflet/tree/main/lexicons/pub/leaflet) → pckt → GreenGale
- See [standard.site](https://standard.site) & [repo](https://tangled.org/standard.site/lexicons)
  ([Source](https://tangled.org/standard.site/lexicons/tree/main/src/lexicons))

### Data Model

#### Publications (`site.standard.publication`)

A publication is a named container (blog/site) owned by a DID. Key `tid`.

| Field         | Type                              | Required | Constraints                        |
| ------------- | --------------------------------- | -------- | ---------------------------------- |
| `url`         | `string` (format: uri)            | Yes      | Base publication URL               |
| `name`        | `string`                          | Yes      | maxLength 5000, maxGraphemes 500   |
| `description` | `string`                          | No       | maxLength 30000, maxGraphemes 3000 |
| `icon`        | `blob` (image/\*)                 | No       | max 1 MiB, 256×256 min             |
| `basicTheme`  | ref → `site.standard.theme.basic` | No       |                                    |
| `preferences` | `#preferences`                    | No       | `showInDiscover` (default true)    |

Verification: `/.well-known/site.standard.publication` on the publication URL returns the AT URI.

#### Documents / Posts (`site.standard.document`)

A document belongs to a publication and holds the post content. Key `tid`.

| Field         | Type                               | Required | Constraints                           |
| ------------- | ---------------------------------- | -------- | ------------------------------------- |
| `site`        | `string` (AT URI or https URL)     | Yes      | Points to the publication             |
| `title`       | `string`                           | Yes      | maxLength 5000, maxGraphemes 500      |
| `content`     | `union([], closed: false)`         | No       | **Open union** — platform-specific    |
| `textContent` | `string`                           | No       | Plaintext fallback (no markup)        |
| `path`        | `string`                           | No       | Slug appended to site URL             |
| `description` | `string`                           | No       | maxLength 30000, maxGraphemes 3000    |
| `coverImage`  | `blob` (image/\*)                  | No       | max 1 MiB                             |
| `tags`        | `string[]`                         | No       | maxLength 1280, maxGraphemes 128 each |
| `publishedAt` | `string` (format: datetime)        | Yes      |                                       |
| `updatedAt`   | `string` (format: datetime)        | No       |                                       |
| `bskyPostRef` | ref → `com.atproto.repo.strongRef` | No       | Cross-post reference                  |

The `content` field is an **open union** (`closed: false`). Standard.Site deliberately does not prescribe a content format — each platform defines its own content type that fills this union. The `textContent` field provides a universal plaintext fallback for platforms that cannot render the native content blocks.

#### Subscriptions (`site.standard.graph.subscription`)

| Field         | Type                      | Required |
| ------------- | ------------------------- | -------- |
| `publication` | `string` (format: at-uri) | Yes      |

### Leaflet Content Model

Leaflet is the first target platform. Its documents use `pub.leaflet.pages.linearDocument` as the content type inside the Standard.Site `content` union.

#### Document (`pub.leaflet.document`)

| Field         | Type                              | Required |
| ------------- | --------------------------------- | -------- |
| `title`       | `string`                          | Yes      |
| `author`      | `string` (format: at-identifier)  | Yes      |
| `pages`       | `union[linearDocument, canvas][]` | Yes      |
| `publication` | `string` (format: at-uri)         | No       |
| `description` | `string`                          | No       |
| `publishedAt` | `string` (format: datetime)       | No       |
| `tags`        | `string[]`                        | No       |
| `coverImage`  | `blob`                            | No       |

#### Pages

- **`pub.leaflet.pages.linearDocument`** — ordered array of blocks with optional alignment (`left` | `center` | `right` | `justify`).
- **`pub.leaflet.pages.canvas`** — blocks with spatial positioning (`x`, `y`, `width`, `height`, `rotation`). Canvas pages are not importable into Writer (skip with warning).

#### Block Types

| Block NSID                          | Required Fields            | Markdown Equivalent              |
| ----------------------------------- | -------------------------- | -------------------------------- |
| `pub.leaflet.blocks.text`           | `plaintext`                | Paragraph                        |
| `pub.leaflet.blocks.header`         | `plaintext`, `level` (1-6) | `#`–`######` heading             |
| `pub.leaflet.blocks.blockquote`     | `plaintext`                | `>` blockquote                   |
| `pub.leaflet.blocks.code`           | `plaintext`                | Fenced code block (+ `language`) |
| `pub.leaflet.blocks.image`          | `image`, `aspectRatio`     | `![alt](url)`                    |
| `pub.leaflet.blocks.orderedList`    | `children`                 | `1.` list items (nested)         |
| `pub.leaflet.blocks.unorderedList`  | `children`                 | `-` list items (nested)          |
| `pub.leaflet.blocks.horizontalRule` | —                          | `---`                            |
| `pub.leaflet.blocks.iframe`         | —                          | Raw URL or omit                  |
| `pub.leaflet.blocks.math`           | —                          | `$$` math block                  |
| `pub.leaflet.blocks.bskyPost`       | —                          | Omit (not representable)         |

#### Rich Text Facets

Leaflet uses Bluesky-style facets (`pub.leaflet.richtext.facet`) to annotate sub-strings of `plaintext` using byte-indexed slices (`byteStart`, `byteEnd`, UTF-8, start inclusive, end exclusive).

| Facet Feature    | Markdown Equivalent        |
| ---------------- | -------------------------- |
| `#bold`          | `**text**`                 |
| `#italic`        | `*text*`                   |
| `#code`          | `` `text` ``               |
| `#strikethrough` | `~~text~~`                 |
| `#link`          | `[text](url)`              |
| `#underline`     | No equivalent (skip)       |
| `#highlight`     | No equivalent (skip)       |
| `#footnote`      | `[^id]` / `[^id]: content` |
| `#didMention`    | `[text](at://did)`         |
| `#atMention`     | `[@handle](at://did)`      |

### Conversion Strategy

#### Leaflet → Markdown (Import)

1. Fetch the document via `com.atproto.repo.getRecord` → deserialize into `pub_leaflet::document::Document`.
2. Match on `DocumentPagesItem` — process `LinearDocument` pages, skip `Canvas` with `<!-- canvas page omitted -->`.
3. For each block (matched via Jacquard's block enums), convert to Markdown using the mapping above.
4. Apply `pub_leaflet::richtext::facet::Facet` annotations to `plaintext` fields — sort by `ByteSlice::byte_start`, walk the string, wrap annotated ranges in Markdown syntax. Match on `FacetFeaturesItem` variants (`Bold`, `Italic`, `Link`, etc.). Handle overlapping/nested facets by applying innermost first.
5. Join blocks with double newlines.
6. Unsupported blocks (`BskyPost`, `Iframe`, `Poll`, `Button`, `Website`, `Page`): emit `<!-- unsupported: {block type} -->`.
7. Images: download blob from PDS via CID, save to the import location, reference with relative path.

#### Markdown → Leaflet Blocks (Publish)

1. Parse Markdown AST (via Comrak in Rust).
2. Map each AST node to the corresponding Jacquard block type using builders (e.g. `Header::builder().plaintext(text).level(2).facets(facets).build()`).
3. Convert inline formatting to `Facet` instances with `ByteSlice` indices on the plaintext representation. Construct via `FacetBuilder` + feature variant structs.
4. Upload images as blobs to the PDS, construct `pub_leaflet::blocks::image::Image` with the returned blob ref.
5. Wrap output blocks in a `LinearDocument` page, build the full `Document` via `DocumentBuilder`.

### XRPC Endpoints & Jacquard Usage

All Standard.Site/Leaflet CRUD uses the same `com.atproto.repo.*` endpoints as Tangled strings — no custom API is needed. Jacquard's generated types provide record structs, builders, and `GetRecordOutput` wrappers for both namespaces, following the same builder + `.send()` pattern used for strings.

| Operation  | Endpoint                        | Collection                  | Auth     |
| ---------- | ------------------------------- | --------------------------- | -------- |
| List pubs  | `com.atproto.repo.listRecords`  | `site.standard.publication` | No       |
| Get pub    | `com.atproto.repo.getRecord`    | `site.standard.publication` | No       |
| List docs  | `com.atproto.repo.listRecords`  | `site.standard.document`    | No       |
| Get doc    | `com.atproto.repo.getRecord`    | `site.standard.document`    | No       |
| Create doc | `com.atproto.repo.createRecord` | `site.standard.document`    | Required |
| Update doc | `com.atproto.repo.putRecord`    | `site.standard.document`    | Required |
| Delete doc | `com.atproto.repo.deleteRecord` | `site.standard.document`    | Required |

Key Jacquard types:

- **Publications:** `site_standard::publication::Publication` / `PublicationBuilder` / `PublicationRecord`
- **Documents:** `site_standard::document::Document` / `DocumentBuilder` / `DocumentRecord`
- **Leaflet docs:** `pub_leaflet::document::Document` / `DocumentBuilder` — `DocumentPagesItem` enum for `linearDocument` vs `canvas`
- **Blocks:** `pub_leaflet::blocks::{text::Text, header::Header, blockquote::Blockquote, code::Code, image::Image, ...}` — each with builder
- **Facets:** `pub_leaflet::richtext::facet::{Facet, FacetBuilder, ByteSlice, FacetFeaturesItem}` — feature variants: `Bold`, `Italic`, `Code`, `Link`, `Strikethrough`, etc.

For reads (no auth), use a stateless `reqwest::Client` with `XrpcExt` or an unauthenticated agent. For writes, the `Agent<OAuthSession>` handles DPoP + token refresh, same as with strings. Use `.into_output()` for owned `'static` data when records outlive the response buffer.

### Backend Module Structure

```sh
crates/core/src/
├── atproto/
│   ├── mod.rs        # shared AT Protocol exports
│   ├── auth.rs       # OAuth/session state
│   ├── strings.rs    # Tangled string helpers
│   ├── leaflet.rs    # Leaflet block ↔ Markdown conversion
│   └── standard_site.rs  # publication + document listing/fetch helpers
src-tauri/src/
├── commands/
│   ├── atproto.rs    # auth/session command wrappers
│   ├── strings.rs    # Tangled string command wrappers
│   └── standard_site.rs  # publication/post command wrappers
```

In the current codebase, the conversion logic belongs in `writer_core::atproto`, with `src-tauri` only responsible for exposing it through Tauri commands. Part 1 is implemented as [leaflet.rs](/Users/owais/Desktop/writer/crates/core/src/atproto/leaflet.rs); `standard_site.rs` remains the intended shared-core location for the record fetch/list helpers from later parts.

### Tauri Commands

| Command             | Args                                           | Returns                                   | Auth     |
| ------------------- | ---------------------------------------------- | ----------------------------------------- | -------- |
| `publication_list`  | `did_or_handle`                                | `CommandResponse<PublicationListResult>`  | No       |
| `publication_get`   | `did_or_handle, tid`                           | `CommandResponse<PublicationRecord>`      | No       |
| `post_list`         | `did_or_handle, publication_tid?`              | `CommandResponse<Vec<PostRecord>>`        | No       |
| `post_get`          | `did_or_handle, tid`                           | `CommandResponse<PostRecord>`             | No       |
| `post_get_markdown` | `did_or_handle, tid`                           | `CommandResponse<String>`                 | No       |
| `post_create`       | `publication_tid, title, markdown, tags?, ...` | `CommandResponse<PostRecord>`             | Required |
| `post_update`       | `tid, title?, markdown?, tags?, ...`           | `CommandResponse<PostRecord>`             | Required |
| `post_delete`       | `tid`                                          | `CommandResponse<()>`                     | Required |

`PublicationRecord`: `uri`, `tid`, `name`, `description`, `url`.
`PublicationListResult`: `publications`, `skipped_invalid_count` (`skippedInvalidCount` in the frontend) so malformed publication records can be skipped without failing the whole browse.
`PostRecord`: `uri`, `tid`, `title`, `description`, `text_content`, `published_at`, `updated_at`, `tags`, `publication_uri`.

`post_get_markdown` should perform Leaflet→Markdown conversion in `writer_core::atproto::leaflet`, with the Tauri command acting as a transport wrapper so the frontend receives ready-to-use content.

### Frontend Structure

```sh
src/
├── ports/commands.ts                    # + publication_list, post_list, post_get, post_get_markdown, post_create, ...
├── state/stores/ui.ts                   # + StandardSiteUiState (import/publish sheet modes)
├── state/selectors.ts                   # + useStandardSiteUiState selector
├── hooks/controllers/
│   └── useStandardSiteController.ts     # publication browsing, post import/publish orchestration
├── components/
│   └── StandardSite/
│       ├── PostImportSheet.tsx           # browse publications → posts → preview markdown → import
│       └── PostPublishSheet.tsx          # select publication → fill title/tags → preview → publish
```

### Import Flow (Pull)

1. User opens import sheet from toolbar or settings panel.
2. Standard.Site post import should remain available without an authenticated Writer/Tangled session because it only reads public records.
3. Enter a handle or DID → call `publication_list` to list their publications and report any skipped malformed records.
4. Select a publication → call `post_list` filtered by that publication.
5. Select a post → call `post_get_markdown` to preview the converted Markdown.
6. Choose a Writer location + relative path → import with `doc_exists` guard + `doc_save`.

### Publish Flow (Push)

1. User triggers "Publish to Standard.Site" from the export menu.
2. If user has publications, show publication picker. If none, prompt to create one (future).
3. Fill title, description, tags. Preview the Markdown that will be converted.
4. Call `post_create` → backend converts Markdown to Leaflet blocks, creates `site.standard.document` record.
5. Store origin tracking for future updates.

### Origin Tracking

Reuse the same pattern as Tangled strings:

- `post_origin` table: `doc_id`, `at_uri`, `tid`, `publication_uri`, `source_did`, `last_synced_at`
- On publish: insert/update origin row.
- On import: insert origin row linking the new document to the source post.
- Re-publish: detect local modifications, surface "Update Post" action.
- Re-pull: compare `updatedAt` / content hash to detect remote changes.

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
- [Standard.Site](https://standard.site)
- [Standard.Site lexicon repo](https://tangled.org/standard.site/lexicons)
- [Standard.Site lexicon source](https://tangled.org/standard.site/lexicons/tree/main/src/lexicons)
- [Leaflet lexicon source](https://tangled.org/leaflet.pub/leaflet/tree/main/lexicons/pub/leaflet)
