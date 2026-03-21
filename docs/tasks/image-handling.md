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

## Test Plan

- [ ] Test import with each supported format
- [ ] Test dedup (import same image twice)
- [ ] Test paste and drag-and-drop flows
- [ ] Test preview rendering with nested document paths
- [ ] `pnpm test:run` + `cargo test` passing
- [ ] `pnpm lint` + `pnpm check` clean
