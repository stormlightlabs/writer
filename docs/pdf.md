---
title: "PDF Exporting"
last_updated: 2026-02-28
---

## Pipeline

PDF export is split into two stages:

1. Backend markdown parse for PDF (`markdown_render_for_pdf`).
2. Frontend PDF rendering and file write (`@react-pdf/renderer` + Tauri dialog/fs plugins).

## Frontend Flow

- UI entry: toolbar export action + `ExportDialog` (unified multi-format dialog supporting PDF, DOCX, and plaintext).
- Runtime export hook: `src/hooks/usePdfExport.tsx`.
- Document renderer: PDF components under `src/components/export/`.
- PDF preview: `src/components/export/preview/PdfPreview.tsx` (uses `pdfjs-dist` with zoom, fit mode, and page navigation).

## Backend Flow

- Command handler lives in `src-tauri/src/commands.rs`.
- Markdown conversion is provided by `crates/markdown`.

## Export Options

The dialog supports page/layout options (size, orientation, font size, line height, margins, header/footer).

PDF export state is tracked in a dedicated Zustand store slice (`isExportingPdf`, `pdfExportError`).

## Failure Handling

- User cancel exits cleanly without writes.
- Export failures are surfaced through export error state.
- Font fallback handling is implemented in `src/pdf/fonts.ts` — custom font fetch failures automatically fall back to builtin fonts.
