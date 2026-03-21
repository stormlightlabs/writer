---
title: Image Handling Spec
updated: 2026-03-21
---

> Goal: Support local image embedding in markdown documents with storage, preview, and lifecycle management.

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

---

## Scope Boundaries

**In scope:**

- Import from file picker, paste, drag-and-drop
- Content-addressed storage in `.writer-assets/`
- Markdown reference insertion
- Preview rendering via Tauri asset protocol
- Single image delete command

**Out of scope (future):**

- Image resizing / thumbnails
- Orphan cleanup
- Image editing / cropping
- Gallery / asset manager UI
- AT Protocol image sync (Leaflet blob ↔ local asset)
- PDF export with embedded images (depends on PDF pipeline)
