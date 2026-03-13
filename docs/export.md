---
title: "Exporting"
last_updated: 2026-03-13
---

## Overview

Writer ships a unified export dialog with three primary output formats:

- PDF
- DOCX
- Plaintext

The plaintext tab also exposes a shortcut to save the original Markdown source without stripping syntax.

UI entry point: `src/components/export/ExportDialog/ExportDialog.tsx`.

## Format Support

### PDF

- Backend command: `markdown_render_for_pdf`
- Frontend rendering: `@react-pdf/renderer`
- Preview: inline PDF preview with zoom, fit mode, and page navigation
- Options: page size, orientation, font size, margins, title/header/footer toggles

Implementation:

- Runtime hook: `src/hooks/usePdfExport.tsx`
- Preview panel: `src/components/export/preview/PdfPreview.tsx`
- PDF document renderer: `src/components/export/MarkdownPdfDocument.tsx`

### DOCX

- Backend command: `markdown_render_for_docx`
- Output: Word-compatible `.docx`
- Intended for editing in Microsoft Word, Pages, or Google Docs import

Implementation:

- Runtime hook: `src/hooks/useDocxExport.tsx`
- Conversion pipeline: `crates/markdown` DOCX transformer

### Plaintext

- Backend command: `markdown_render_for_text`
- Output: Markdown stripped while preserving readable document structure
- Best for plain text sharing, note migration, or downstream processing

Implementation:

- Runtime hook: `src/hooks/useTextExport.tsx`
- Preview panel: `src/components/export/preview/TextPreview.tsx`

### Markdown source save

- Triggered from the plaintext tab
- Bypasses markdown transformation and writes the current editor text directly as `.md`

Implementation:

- `useMarkdownExport` in `src/hooks/useTextExport.tsx`

## Dialog Behavior

- PDF is the default tab.
- On wider viewports, PDF and plaintext show a preview pane beside export controls.
- DOCX does not render an inline preview; it documents what formatting is preserved instead.
- Export actions close the dialog only after a successful write.

## State

Export state is split by format:

- PDF: `src/state/stores/pdf-export.ts`
- Plaintext/Markdown: `src/state/stores/text-export.ts`
- DOCX: `src/state/stores/docx-export.ts`

These stores track in-flight export state and user-visible error messages.

## Failure Handling

- No file is written until the user picks a destination path.
- Canceling the save dialog exits cleanly without side effects.
- PDF export retries with built-in fonts if custom font registration fails.
- DOCX and plaintext failures surface through export state and toasts.

## File Naming

- PDF defaults to the rendered title when available.
- DOCX and plaintext use sanitized document titles when available.
- Markdown source save writes a sanitized `.md` filename based on the active tab title.
