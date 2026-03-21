---
title: Image Handling
updated: 2026-03-21
---

## Backend (Tauri + Rust)

- [ ] Add `.writer-assets/` directory creation on location init
  - Create directory if missing when a location is opened
  - Add to `.gitignore`-style ignore list for file watcher (don't index asset files as documents)
- [ ] Implement `image_import` command
  - Validate format (PNG, JPEG, GIF, WebP, SVG) and size (≤10 MB)
  - Hash file contents with blake3, derive filename
  - Copy to `.writer-assets/<hash>.<ext>`
  - Dedup: if hash exists, return existing path
  - Return relative asset path string
- [ ] Implement `image_delete` command
  - Remove file from `.writer-assets/`
  - No dangling reference scan
- [ ] Implement `image_list` command
  - List all files in `.writer-assets/`
  - Return filename, size, extension
- [ ] Register commands in `lib.rs` and expose via Tauri

## Frontend Ports & State

- [ ] Add command builders in `src/ports/commands.ts`
  - `imageImport(locationId, sourcePath, onOk, onErr)`
  - `imageDelete(locationId, assetPath, onOk, onErr)`
  - `imageList(locationId, onOk, onErr)`
- [ ] Add controller hook `useImageController` or extend workspace controller
  - `importImage(file)` — write temp file, call `image_import`, insert markdown at cursor
  - `deleteImage(assetPath)` — call `image_delete`

## Editor Integration

- [ ] Paste handler
  - Intercept clipboard paste with image data
  - Write to temp file, call `image_import`, insert `![image](.writer-assets/hash.ext)` at cursor
- [ ] Drag-and-drop handler
  - Intercept file drop on editor area
  - Filter to supported image formats
  - Same import + insert flow as paste
- [ ] **3.3** Toolbar "Insert Image" button
  - Open Tauri file picker dialog filtered to image types
  - Import selected file, insert reference

## Preview Rendering

- [ ] Resolve `.writer-assets/` paths in markdown preview
  - Use `convertFileSrc()` or Tauri asset protocol to create displayable URLs
  - Handle relative path resolution for documents in subdirectories
- [ ] Image display styling
  - `max-width: 100%`, responsive within content column
  - Maintain aspect ratio
- [ ] Click-to-zoom (optional polish)
  - Click image in preview to open full-size overlay

## AT Protocol Blob Sync

### Backend (Rust)

- [ ] Implement `blob_upload` command
  - Read file from `.writer-assets/`, determine MIME type from extension
  - Call `com.atproto.repo.uploadBlob` on user's PDS
  - Return `BlobRef` (CID, MIME type, size)
- [ ] Implement `blob_download` command
  - Call `com.atproto.sync.getBlob` with DID + CID
  - Pipe response bytes through `image_import` (hash, dedup, store)
  - Return local `.writer-assets/<hash>.<ext>` path
- [ ] Fix `image_from_url` metadata in `leaflet.rs`
  - Replace hardcoded `application/octet-stream` / size 0 with real values from `blob_upload` response
  - Thread `BlobRef` metadata through publish pipeline into `Image` block construction
- [ ] Register `blob_upload` and `blob_download` in `lib.rs`

### Publish Pipeline Integration

- [ ] Add image rewrite step to publish flow
  - Scan markdown for `.writer-assets/` image paths before Leaflet conversion
  - Upload each via `blob_upload`, collect CID mapping
  - Rewrite `.writer-assets/<hash>.<ext>` → `at://blob/<CID>` in-memory (don't mutate local document)
  - Pass rewritten markdown to `markdown_to_leaflet_document`

### Import Pipeline Integration

- [ ] Add blob download step to Standard.Site post import
  - After `post_get_markdown`, scan result for `at://blob/<CID>` image refs
  - For each, call `blob_download` with author DID + CID
  - Rewrite `at://blob/<CID>` → `.writer-assets/<hash>.<ext>` in the markdown
  - Save the rewritten markdown to disk

### Frontend

- [ ] Add command builders in `src/ports/commands.ts`
  - `blobUpload(locationId, assetPath, auth, onOk, onErr)`
  - `blobDownload(locationId, did, cid, onOk, onErr)`
- [ ] Update Standard.Site import controller to call blob download + rewrite

## PDF Export with Embedded Images

### Backend (Rust)

- [ ] Add `Image` variant to `PdfNode` enum in `crates/markdown/src/lib.rs`
  - Fields: `src: String`, `alt: String`
- [ ] Update `transform_to_pdf_nodes()` in `crates/markdown/src/transformer.rs`
  - Handle Comrak image nodes → emit `PdfNode::Image`
- [ ] Update `PdfRenderResult` serialization to include new variant

### Frontend

- [ ] Add image path resolution for PDF renderer
  - Resolve `.writer-assets/` paths to base64 data URLs (similar to font preloading in `src/pdf/fonts.ts`)
  - Use `convertFileSrc()` → fetch bytes → encode as `data:<mime>;base64,...`
- [ ] Add `Image` case to `MarkdownPdfDocument.tsx` node renderer
  - Render `<Image src={resolvedDataUrl} />` with `maxWidth: 100%`, preserve aspect ratio
- [ ] Update `usePdfExport.tsx` to preload images before render
  - Scan PdfNodes for Image variants, resolve all paths, then render
- [ ] Handle SVG gracefully — skip or render placeholder if `@react-pdf/renderer` doesn't support it

## Test Plan

- [ ] Test import with each supported format
- [ ] Test dedup (import same image twice)
- [ ] Test paste and drag-and-drop flows
- [ ] Test preview rendering with nested document paths
- [ ] Test blob upload round-trip (local image → upload → verify CID returned)
- [ ] Test blob download round-trip (CID → download → verify stored in `.writer-assets/`)
- [ ] Test publish with images (`.writer-assets/` refs rewritten to `at://blob/` in output)
- [ ] Test import with images (`at://blob/` refs rewritten to `.writer-assets/` in saved markdown)
- [ ] Test PDF export with embedded images (images render in output PDF)
- [ ] Test PDF export with missing image (graceful fallback, no crash)
- [ ] `pnpm test:run` + `cargo test` passing
- [ ] `pnpm lint` + `pnpm check` clean
