---
title: Find in Document
updated: 2026-04-15
---

> Goal: Add in-document find (and replace) using CodeMirror's `@codemirror/search`, separate from the existing cross-document search.

## Problem

`Cmd+F` currently toggles focus mode. Cross-document search lives behind `Cmd+Shift+F`. There is no way to find text within the active document — a basic editor expectation.

## Design

### Keybinding changes

| Shortcut      | Current          | New                                    |
| ------------- | ---------------- | -------------------------------------- |
| `Cmd+F`       | Focus mode       | Find in document                       |
| `Cmd+Shift+F` | Cross-doc search | Cross-doc search (unchanged)           |
| `Cmd+Shift+H` | —                | Find & replace in document             |
| `Cmd+E`       | —                | Focus mode (relocated)                 |
| `Escape`      | —                | Close find bar, return focus to editor |

### CodeMirror integration

`@codemirror/search` is already a dependency. Wire it up as a CM extension:

```ts
import {
    search,
    searchKeymap,
    openSearchPanel,
    closeSearchPanel,
} from "@codemirror/search";
```

- Add `search()` and `keymap.of(searchKeymap)` to the editor's extension list via a new compartment (`compartments.search`).
- The built-in search panel renders inside the CM DOM — no custom React overlay needed.
- Theme the panel to match oxocarbon light/dark via `EditorView.theme` selectors (`.cm-search`, `.cm-search input`, `.cm-button`).

### State

No new Zustand state. CM owns the find panel visibility and query internally. The only app-level change is relocating the focus-mode shortcut.

### Scope

- **In scope**: find, find-next/prev, replace, replace-all, case-sensitive toggle, regex toggle.

#### Future

- find across multiple open tabs, persistent find-bar state across document switches.
