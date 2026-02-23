---
title: "PDF Exporting"
last_updated: 2026-02-23
---

## Tauri

- PDF generation is split across backend parsing and frontend rendering.
- Backend command: `markdown_render_for_pdf` (`src-tauri/src/commands.rs`).
- The command uses `writer_md::MarkdownEngine::render_for_pdf` (`crates/markdown/src/lib.rs`)
  to parse Markdown and return a PDF-oriented AST (`PdfRenderResult`), not raw PDF bytes.
- Returned payload includes:
- `nodes`: normalized document nodes
- `title`: optional title (front matter title if present)
- `word_count`: estimated words
- Supported node types in the current AST:
- `heading`, `paragraph`, `code`, `list`, `blockquote`, `footnote`
- Important constraint: this AST is intentionally simplified for stable rendering
  (for example, inline formatting is flattened to text and many advanced Markdown
  structures are not represented as dedicated PDF node types yet).

## React

- UI entry point is `PdfExportDialog` (`src/components/pdf/ExportDialog/ExportDialog.tsx`),
  opened from the toolbar.
- Export flow in `src/App.tsx`:
- Request AST from backend via `renderMarkdownForPdf(...)` (ports command -> Tauri command).
- Pass AST + export options into `usePdfExport()`.
- `usePdfExport` (`src/hooks/usePdfExport.tsx`) renders a React PDF document (`MarkdownPdfDocument`) with `@react-pdf/renderer`, then writes bytes to a user-selected path via Tauri plugins.

### Rendering Pipeline

- `MarkdownPdfDocument` (`src/components/pdf/MarkdownPdfDocument.tsx`) maps AST nodes to React PDF primitives (`Document`, `Page`, `Text`, `View`).
- Export options currently exposed in UI:
- page size, orientation, font size, margins, include header, include footer
- Header/footer rendering is optional and controlled by options.
- Body font follows the current editor font family; code blocks use IBM Plex Mono.

### Font Strategy and Fallback

- Font registration is handled by `src/pdf/fonts.ts`.
- Primary path uses custom bundled font files from `/public/fonts`.
- If custom font loading/rendering fails, export retries automatically with built-in PDF fonts (`Helvetica` / `Times-Roman` / `Courier`) to maximize success.
- Font errors are wrapped/serialized (`src/pdf/errors.ts`) and logged with context.

### File Output and State

- Output is written using:
- `@tauri-apps/plugin-dialog` (`save`) for destination
- `@tauri-apps/plugin-fs` (`writeFile`) for bytes
- Export lifecycle state is tracked in Zustand (`isExportingPdf`, `pdfExportError` in `src/state/appStore.ts`) via `startPdfExport`, `finishPdfExport`, and `failPdfExport`.
- If the user cancels the save dialog, export exits cleanly without writing a file.

### Persistence Notes

- PDF files themselves are persisted to the chosen filesystem path.
- Export dialog options are local React state (session-only) and are not currently persisted in app settings.
