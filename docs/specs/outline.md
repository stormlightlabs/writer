---
title: Document Outline
updated: 2026-04-15
---

> Goal: Surface the Rust-generated `metadata.outline` in the UI so users can see document structure and jump to headings.

## Problem

The markdown crate already extracts an outline (`Vec<Heading>`) during render, and the TS types mirror it (`Heading[]` on `DocumentMetadata`). Neither the frontend nor the preview consume it — the data is discarded.

## Design

### Anchor generation (Rust)

The parser currently pushes `anchor: None` for every heading. To support scroll-to-heading the anchors need to be populated and injected into the rendered HTML.

- Derive anchors from heading text: lowercase, strip non-alphanumeric, replace spaces with `-` (GitHub-flavored style).
- Deduplicate by appending `-1`, `-2`, etc. for collisions.
- Inject `id="<anchor>"` on the rendered `<h1>`–`<h6>` tags.
- Populate `Heading.anchor` so the frontend receives usable IDs.

### State

Add to the app store:

```ts
outlinePanelOpen: boolean; // persisted in workspace prefs
```

Selector: `useOutline()` — returns `Heading[]` from the active document's most recent render result (already in state via preview).

### Outline panel (React)

New component `src/components/OutlinePanel/OutlinePanel.tsx`.

- Renders a flat list of headings indented by level (padding-left per level).
- Each item shows the heading text, truncated with ellipsis if needed.
- Click dispatches a scroll command to the preview/editor.
- Empty state: muted "No headings" text when outline is empty.
- Panel visibility toggled via toolbar button + keyboard shortcut.

### Scroll-to-heading

Two targets depending on active view:

| View | Mechanism |
|---|---|
| Preview (webview) | `postMessage({ type: 'scroll-to', anchor })` → preview JS calls `document.getElementById(anchor).scrollIntoView()` |
| Editor (CodeMirror) | Find heading line in raw markdown, dispatch CM `scrollIntoView` for that line |

### Layout integration

The outline panel sits in the right sidebar area (alongside diagnostics). Only one right-panel is visible at a time — toggling outline closes diagnostics and vice versa.

### Keyboard shortcut

`Cmd+Shift+O` — toggle outline panel.

## Scope exclusions

- Drag-to-reorder headings.
- Heading renaming from the outline.
- Outline in exported PDF (separate TOC feature).
