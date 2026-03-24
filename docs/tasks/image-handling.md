---
title: Image Handling
updated: 2026-03-24
---

## AT Protocol Blob Sync

### Backend (Rust)

- [ ] Implement `blob_upload` command
  - Resolve `asset_rel_path` within location root, determine MIME type
  - Call `com.atproto.repo.uploadBlob` on user's PDS
  - Return `BlobRef` (CID, MIME type, size)
- [ ] Implement `blob_download` command
  - Call `com.atproto.sync.getBlob` with DID + CID
  - Pipe response bytes through `image_import` with `target_dir`
  - Return local relative path
- [ ] Fix `image_from_url` metadata in `leaflet.rs`
  - Replace hardcoded `application/octet-stream` / size 0 with real `BlobRef` values
  - Thread metadata through publish pipeline into `Image` block construction
- [ ] Register `blob_upload` and `blob_download` in `lib.rs`

### Publish Pipeline Integration

- [ ] Add image rewrite step to publish flow
  - Scan markdown for local image paths before Leaflet conversion
  - Resolve each via `asset_resolve`, upload via `blob_upload`, collect CID mapping
  - Rewrite local paths → `at://blob/<CID>` in-memory (don't mutate local document)
  - Pass rewritten markdown to `markdown_to_leaflet_document`

### Import Pipeline Integration

- [ ] Add blob download step to Standard.Site post import
  - After `post_get_markdown`, scan for `at://blob/<CID>` image refs
  - For each, call `blob_download` with author DID + CID + target dir
  - Rewrite `at://blob/<CID>` → `<hash>.<ext>` in the markdown
  - Save rewritten markdown to disk

### Frontend

- [ ] Add command builders in `src/ports/commands.ts`
  - `blobUpload(locationId, assetRelPath, auth, onOk, onErr)`
  - `blobDownload(locationId, did, cid, targetDir, onOk, onErr)`
- [ ] Update Standard.Site import controller to call blob download + rewrite
