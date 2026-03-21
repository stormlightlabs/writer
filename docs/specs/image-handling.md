---
title: Image Handling Spec
updated: 2026-03-21
---

> Goal: Support local image embedding in markdown documents with storage, preview, lifecycle management, AT Protocol blob sync, and PDF export.

## Problem

Images in documents are currently only supported through AT Protocol Leaflet blob references (`at://blob/CID`). There is no local image support — no upload, no storage, no preview, no drag-and-drop. Users cannot embed images in their markdown files.

## Design

### Storage Model

Each location gets an asset directory at its root:

```sh
<location_root>/
  .writer-assets/
    <content-hash>.png
    <content-hash>.jpg
    ...
  my-document.md
  drafts/
    another-doc.md
```

- **Directory**: `.writer-assets/` — hidden by convention, one per location.
- **Naming**: content-addressed (`blake3` hash of file bytes + original extension). Prevents duplicates and naming collisions.
- **Formats**: PNG, JPEG, GIF, WebP, SVG. Reject anything else at the command boundary.
- **Size limit**: 10 MB per image. Enforced in the Tauri command.

### Markdown Reference Format

Standard markdown image syntax with a relative path:

```markdown
![Alt text](.writer-assets/abc123def.png)
```

- Relative to the document's location root, not the document's own directory.
- When a document is in a subdirectory (`drafts/doc.md`), the path is still relative to location root: `![img](../.writer-assets/abc123.png)` — or the editor resolves it at render time.

### Tauri Commands (Rust)

#### `image_import`

```rust
#[tauri::command]
pub fn image_import(location_id: LocationId, source_path: PathBuf) -> Result<String, Error>
```

- Copies source file into `.writer-assets/`.
- Hashes contents, derives filename.
- Returns the relative asset path string (e.g., `.writer-assets/abc123.png`).
- If hash already exists, returns existing path (dedup).
- Validates format and size before copying.

#### `image_delete`

```rust
#[tauri::command]
pub fn image_delete(location_id: LocationId, asset_path: String) -> Result<bool, Error>
```

- Removes the file from `.writer-assets/`.
- Does **not** scan documents for dangling references (user's responsibility, or future cleanup pass).

#### `image_list`

```rust
#[tauri::command]
pub fn image_list(location_id: LocationId) -> Result<Vec<ImageAsset>, Error>
```

- Returns all images in `.writer-assets/` with metadata (filename, size, dimensions if cheaply available).

### Frontend

#### Editor Integration

- **Paste**: intercept clipboard paste events containing image data. Call `image_import` with a temp file, insert markdown reference at cursor.
- **Drag-and-drop**: intercept file drop on the editor area. Same flow as paste.
- **Toolbar button**: "Insert Image" opens a file picker dialog (Tauri `dialog::open`), imports, inserts reference.

#### Preview Rendering

- The markdown preview must resolve `.writer-assets/` paths to `asset:` protocol URLs (Tauri asset protocol) or `convertFileSrc()` for display.
- Images render inline with `max-width: 100%` and optional click-to-zoom.

#### State

No dedicated image store slice needed. Images are embedded in document text as markdown. The `image_list` command is called on-demand when needed (e.g., an asset manager UI, if ever built).

### Indexing

The document index (`documents` table in SQLite) does **not** track images. Images are filesystem-only artifacts referenced by markdown text. This keeps the model simple — no foreign keys, no orphan tracking.

### Cleanup

Orphaned images (not referenced by any document) accumulate over time. A future `image_cleanup` command can scan all documents in a location and remove unreferenced assets. This is **out of scope** for the initial implementation.

### AT Protocol Blob Sync

Bridges local `.writer-assets/` images and AT Protocol blob references (`at://blob/CID`) so images survive publish and import round-trips.

#### Publish direction (local → remote)

When a document containing `.writer-assets/` image references is published to Leaflet/Standard.Site:

1. **Scan** the markdown for `.writer-assets/` image paths.
2. **Read** each referenced file from the location's `.writer-assets/` directory.
3. **Upload** each file via `com.atproto.repo.uploadBlob` on the user's PDS. The PDS returns a `BlobRef` with a populated CID, MIME type, and size.
4. **Rewrite** the markdown image references from `.writer-assets/<hash>.<ext>` to `at://blob/<CID>` before building the Leaflet document.
5. **Populate** the `Image` block's blob metadata correctly (MIME type from extension, actual file size, aspect ratio if cheaply available) instead of the current hardcoded values (`application/octet-stream`, size 0).

The rewrite is transient — it happens in-memory during the publish pipeline. The local document retains its `.writer-assets/` references.

#### Import direction (remote → local)

When a Leaflet/Standard.Site post containing blob images is imported:

1. **Detect** `at://blob/<CID>` image references in the converted markdown.
2. **Download** each blob from the author's PDS via `com.atproto.sync.getBlob` (params: DID + CID).
3. **Import** the downloaded bytes through the existing `image_import` flow (hash, dedup, store in `.writer-assets/`).
4. **Rewrite** the markdown image references from `at://blob/<CID>` to `.writer-assets/<hash>.<ext>`.

This means imported posts get fully local images that render in preview without network access.

#### Tauri Commands

##### `blob_upload`

```rust
#[tauri::command]
pub async fn blob_upload(
    location_id: LocationId,
    asset_path: String,
    auth: AuthSession,
) -> Result<BlobRef, Error>
```

- Reads the file from `.writer-assets/`, determines MIME type from extension.
- Calls `com.atproto.repo.uploadBlob` with the file bytes.
- Returns the `BlobRef` (CID, MIME type, size) for use in Leaflet document construction.

##### `blob_download`

```rust
#[tauri::command]
pub async fn blob_download(
    location_id: LocationId,
    did: String,
    cid: String,
) -> Result<String, Error>
```

- Calls `com.atproto.sync.getBlob` with the DID and CID.
- Writes the response bytes through `image_import` (hash, dedup, store).
- Returns the local `.writer-assets/<hash>.<ext>` path.

#### Metadata Accuracy

The current `image_from_url` in `leaflet.rs` hardcodes blob metadata:

```rust
mime_type: MimeType::new_static("application/octet-stream"),
size: 0,
```

With blob sync, `blob_upload` returns real metadata from the PDS. The publish pipeline must thread this metadata into the `Image` block construction so Leaflet clients render images correctly.

### PDF Export with Embedded Images

The PDF pipeline (`crates/markdown` → `@react-pdf/renderer`) currently has no image support. Extending it requires changes at both layers.

#### Rust: PdfNode Image Variant

Add an `Image` variant to `PdfNode`:

```rust
pub enum PdfNode {
    // ... existing variants ...
    Image { src: String, alt: String },
}
```

- `src`: the `.writer-assets/<hash>.<ext>` path as written in markdown.
- `alt`: the alt text from `![alt](src)`.

Update `MarkdownTransformer::transform_to_pdf_nodes()` to emit `PdfNode::Image` when it encounters a Comrak image node, instead of silently dropping it.

#### Frontend: Path Resolution

The `@react-pdf/renderer` `<Image>` component accepts a `src` that can be a URL, a file path, or a base64 data URL. Since Tauri asset protocol URLs may not work inside the PDF renderer's internal fetch:

- Resolve `.writer-assets/` paths to **base64 data URLs** before passing to the renderer.
- Use `convertFileSrc()` to get the Tauri asset URL, fetch the bytes via the webview, then encode to `data:<mime>;base64,...`.
- This is similar to the font preloading strategy already in `src/pdf/fonts.ts`.

#### Frontend: MarkdownPdfDocument Rendering

Add an `Image` case to the node renderer in `MarkdownPdfDocument.tsx`:

```tsx
case "Image":
  return <Image src={resolvedSrc} style={{ maxWidth: "100%" }} />;
```

- Respect page margins — images should not overflow the content area.
- Preserve aspect ratio.

#### Limitations

- SVG images may not be supported by `@react-pdf/renderer`. Fall back to a placeholder or skip with a warning.
- Very large images should be resized to reasonable print dimensions to avoid bloating PDF file size. This can be deferred — initial implementation embeds at original resolution.

---

## Scope Boundaries

**In scope:**

- Import from file picker, paste, drag-and-drop
- Content-addressed storage in `.writer-assets/`
- Markdown reference insertion
- Preview rendering via Tauri asset protocol
- Single image delete command
- AT Protocol blob sync (upload on publish, download on import)
- PDF export with embedded images

**Out of scope (future):**

- Image resizing / thumbnails
- Orphan cleanup
- Image editing / cropping
- Gallery / asset manager UI
