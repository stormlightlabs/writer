---
title: Image Handling Spec
updated: 2026-03-24
---

> Goal: Support local image embedding in markdown documents with inline storage, preview, AT Protocol blob sync, and PDF export.

## Problem

Images are stored as regular files under the location root `images/` directory. They remain visible in the sidebar and are managed like any other file.

## Design

### Storage Model

Images are regular files within the location. No dedicated asset directory.

```sh
<location_root>/
  my-document.md
  abc123def.png          ← imported via paste/drop
  drafts/
    another-doc.md
    f9e8d7c6b.jpg        ← imported while editing another-doc.md
```

- **Location**: imported images are placed in the same directory as the active document.
- **Naming**: content-addressed (`blake3` hash of file bytes + original extension). Prevents duplicates and collisions from paste/drag-drop imports. User-placed images keep their original names.
- **Formats**: PNG, JPEG, GIF, WebP, SVG. Validated at the import command boundary.
- **Size limit**: 10 MB per image, enforced in the Tauri command.
- **Visibility**: images appear in the file browser alongside documents. The indexer catalogs them in the `documents` table (metadata only, no FTS).

### Markdown Reference Format

Standard markdown image syntax with a relative path:

```markdown
![Alt text](abc123def.png)
![Photo](../photos/image.jpg)
```

Paths are relative to the document's own directory, following standard markdown conventions.

### File Browser

The sidebar shows all non-hidden files in the location. Image files appear alongside documents. No special filtering — the existing `reconcile_location_index` already indexes all files and `doc_list` returns them.

Hidden directories (names starting with `.`) are skipped during file collection.

### Tauri Commands (Rust)

#### `image_import`

```rust
#[tauri::command]
pub fn image_import(
    location_id: LocationId,
    source_path: PathBuf,
    target_dir: String,  // relative to location root, e.g. "" or "drafts"
) -> Result<String, Error>
```

- Validates format and size.
- Hashes contents with blake3, derives filename as `<hash>.<ext>`.
- Copies to `<location_root>/<target_dir>/<hash>.<ext>`.
- Dedup: if hash-named file already exists in target dir, returns existing path.
- Returns the relative path from location root (e.g., `abc123.png` or `drafts/abc123.png`).

#### `image_delete`

```rust
#[tauri::command]
pub fn image_delete(location_id: LocationId, rel_path: String) -> Result<bool, Error>
```

- Validates `rel_path` resolves within the location root (path-traversal guard).
- Validates the file has a supported image extension.
- Removes the file. Returns `true` if removed, `false` if not found.

#### `asset_resolve`

```rust
#[tauri::command]
pub fn asset_resolve(
    location_id: LocationId,
    doc_rel_path: PathBuf,
    asset_path: String,
) -> Result<String, Error>
```

Unchanged. Resolves a markdown-relative path against the source document's directory. Rejects traversal outside the location root.

### Removed Commands

- **`image_list`**: no longer needed. Images are in the `documents` table; use `doc_list` with an extension filter.

### Frontend

#### Editor Integration

- **Paste**: intercept clipboard paste with image data. Write to temp file, call `image_import` with `target_dir` set to the active document's directory. Insert `![image](hash.ext)` at cursor.
- **Drag-and-drop**: intercept file drop on editor area. Same import flow as paste.
- **Toolbar button**: file picker dialog filtered to image types. Import, insert reference.

#### Preview Rendering

Unchanged. The preview resolves any relative image path via `asset_resolve`, converts to a Tauri `asset:` URL. Images render inline with `max-width: 100%` and click-to-zoom.

#### State

No dedicated image state. Images are markdown references in document text and regular entries in the document index.

### Indexing

All non-hidden files are indexed in the `documents` table during `reconcile_location_index`. Image files get metadata (filename, size, mtime) but no FTS content — `is_indexable_text_path` already gates FTS to md/markdown/mdx/txt extensions.

Hidden directories (dotfiles) are excluded from both file collection and file watcher events. This is a general policy, not image-specific.

### AT Protocol Blob Sync

Bridges local image references and AT Protocol blob references (`at://blob/CID`) for publish/import round-trips.

#### Publish direction (local → remote)

1. **Scan** markdown for local image paths (any relative path pointing to an image file).
2. **Resolve** each path via `asset_resolve` to get the absolute file location.
3. **Upload** each via `com.atproto.repo.uploadBlob`. PDS returns a `BlobRef` (CID, MIME type, size).
4. **Rewrite** image references to `at://blob/<CID>` in-memory before building the Leaflet document.
5. **Populate** `Image` block metadata from the `BlobRef` instead of hardcoded values.

The rewrite is transient — the local document retains its relative paths.

#### Import direction (remote → local)

1. **Detect** `at://blob/<CID>` image references in converted markdown.
2. **Download** each blob via `com.atproto.sync.getBlob` (DID + CID).
3. **Import** downloaded bytes through `image_import` (hash, dedup, store in document's directory).
4. **Rewrite** `at://blob/<CID>` → `<hash>.<ext>` in the markdown.

#### Tauri Commands

##### `blob_upload`

```rust
#[tauri::command]
pub async fn blob_upload(
    location_id: LocationId,
    asset_rel_path: String,
    auth: AuthSession,
) -> Result<BlobRef, Error>
```

- Resolves `asset_rel_path` within the location root, reads file bytes, determines MIME type.
- Calls `com.atproto.repo.uploadBlob`.
- Returns `BlobRef` for Leaflet document construction.

##### `blob_download`

```rust
#[tauri::command]
pub async fn blob_download(
    location_id: LocationId,
    did: String,
    cid: String,
    target_dir: String,
) -> Result<String, Error>
```

- Downloads blob via `com.atproto.sync.getBlob`.
- Pipes bytes through `image_import` to `target_dir`.
- Returns the local relative path.

### PDF Export with Embedded Images

No changes needed for the refactor. The PDF pipeline already resolves image paths via `asset_resolve` and converts to base64 data URLs. The `PdfNode::Image` variant carries the `src` as written in markdown; the frontend resolver handles any relative path.

---

## Scope Boundaries

**In scope:**

- Import from file picker, paste, drag-and-drop into document's directory
- Content-hash naming for imported images
- Images visible in file browser
- Markdown reference insertion with relative paths
- Preview rendering via Tauri asset protocol
- AT Protocol blob sync (upload on publish, download on import)
- PDF export with embedded images
- Hidden-directory exclusion from indexing/watching

**Out of scope (future):**

- Image resizing / thumbnails
- Orphan cleanup
- Image editing / cropping
- Gallery / asset manager UI
