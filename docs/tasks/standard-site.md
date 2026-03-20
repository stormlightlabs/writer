---
title: "Standard.Site Pubs & Posts integration"
updated: 2026-03-20
---

Pull and push long-form posts from/to AT Protocol publishing platforms using Standard.Site shared lexicons. Leaflet is the first target platform. All record types and builders come from Jacquard's `pub_leaflet` and `site_standard` feature flags.

## Part 1 — Leaflet Block ↔ Markdown Conversion

1. **Leaflet → Markdown converter** — `src-tauri/src/atproto/leaflet.rs`
   - Deserialize `pub_leaflet::document::Document`, match on `DocumentPagesItem` variants
   - Map Jacquard block types (`blocks::text::Text`, `blocks::header::Header`, etc.) to Markdown equivalents
   - Convert `pub_leaflet::richtext::facet::Facet` annotations (matching on `FacetFeaturesItem` variants: `Bold`, `Italic`, `Link`, `Code`, `Strikethrough`, etc.) to inline Markdown syntax
   - Handle nested list items with recursive conversion
   - Skip `Canvas` pages and unsupported block variants with comment markers
2. **Markdown → Leaflet block builder** — same module, reverse direction
   - Parse Markdown AST via Comrak
   - Construct Jacquard block types using builders (e.g. `Header::builder().plaintext(text).level(2).facets(facets).build()`)
   - Convert inline formatting to `Facet` instances with `ByteSlice` indices via `FacetBuilder`
   - Wrap output in a `LinearDocument` page, build full `Document` via `DocumentBuilder`
3. **Rust tests** — round-trip conversion tests for each block type and facet combination

## Part 2 — Pull (Import Posts)

1. **Backend helpers** — `src-tauri/src/atproto/standard_site.rs`
   - `listRecords` wrapper for `site_standard::publication::Publication` and `site_standard::document::Document`
   - `getRecord` wrapper deserializing into Jacquard types, extracting Leaflet content from the `content` open union
2. **Tauri commands** — `publication_list`, `publication_get`, `post_list`, `post_get`, `post_get_markdown`
3. **Frontend import UI** — `PostImportSheet.tsx`
   - Enter handle/DID → browse publications → browse posts → preview converted Markdown → import to location
   - Reuse existing import patterns from `ImportSheet.tsx`
4. **Port + state wiring** — command wrappers in `ports/commands.ts`, `StandardSiteUiState` in Zustand store, `useStandardSiteUiState` selector
5. **Image handling** — download blobs from PDS via CID, save to import location, reference with relative paths

## Part 3 — Push (Publish Posts)

1. **Tauri commands** — `post_create`, `post_update`, `post_delete`
   - Accept Markdown + metadata, convert to Leaflet blocks via Jacquard builders server-side
   - Upload images as blobs to PDS, construct `pub_leaflet::blocks::image::Image` with returned blob ref
   - Build `site_standard::document::Document` via `DocumentBuilder` with Leaflet content in the `content` union
2. **Publish UI** — `PostPublishSheet.tsx`
   - Publication picker (list user's publications via `site_standard::publication` records)
   - Title, description, tags input with preview
   - Integrated into export menu alongside "Publish as String"
3. **Origin tracking** — `post_origin` SQLite table (`doc_id`, `at_uri`, `tid`, `publication_uri`, `source_did`, `last_synced_at`)

## Part 4 — Sync & Re-publish

1. **Re-publish detection** — detect local modifications to previously published posts, surface "Update Post" action
2. **Re-pull detection** — compare `updatedAt` / content hash to detect remote changes, prompt with diff
3. **Publication management** — create new publications from Writer (future, dependent on Standard.Site ecosystem maturity)
