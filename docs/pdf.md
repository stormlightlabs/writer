---
title: "PDF Exporting"
last_updated: 2026-03-24
---

For the full multi-format export flow, see [Exporting](./export.md).

## Pipeline

PDF export is split into two stages:

1. Backend markdown parse for PDF (`markdown_render_for_pdf`).
2. Frontend PDF rendering and file write (`@react-pdf/renderer` + Tauri dialog/fs plugins).

## Frontend Flow

- UI entry: toolbar export action + `ExportDialog` (unified multi-format dialog supporting PDF, DOCX, and plaintext).
- Runtime export hook: `src/hooks/usePdfExport.tsx`.
- Document renderer: PDF components under `src/components/export/`.
- PDF preview: `src/components/export/preview/PdfPreview.tsx` (uses `pdfjs-dist` with zoom, fit mode, and page navigation).
- Local image hydration: `src/pdf/images.ts` resolves location-scoped markdown asset paths, fetches raster images through Tauri asset URLs, and converts SVGs through the backend before handing them to `@react-pdf/renderer`.

## Backend Flow

- Command handler lives in `src-tauri/src/commands.rs`.
- Markdown conversion is provided by `crates/markdown`.
- Asset resolution is validated in Tauri/store (`asset_resolve`) so preview and PDF export share the same location-scoped path rules.

## Export Options

The dialog supports page/layout options (size, orientation, font size, line height, margins, header/footer).

PDF export state is tracked in a dedicated Zustand store slice (`isExportingPdf`, `pdfExportError`).

## Failure Handling

- User cancel exits cleanly without writes.
- Export failures are surfaced through export error state.
- Font fallback handling is implemented in `src/pdf/fonts.ts` — custom font fetch failures automatically fall back to builtin fonts.
- Missing or invalid local images are skipped per-image with debug logging instead of aborting the whole preview/export.
- Images inside markdown list items are preserved in the PDF AST and renderer instead of being flattened into plain text.
