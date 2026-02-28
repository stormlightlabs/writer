---
title: "Writing and NLP"
last_updated: 2026-02-28
---

## Current Features

Writer includes two writing-assist features:

- Style Check
- Parts-of-Speech (POS) highlighting

Both are editor decorations; neither mutates the underlying document text.

## Style Check

- Dictionary/pattern matching is implemented in Rust (`crates/core/src/nlp.rs`) using `aho-corasick`.
- Frontend decorations remain in `src/editor/style-check.ts` and call the backend `style_check_scan` command.
- Matches are classified against:
  - filler
  - redundancy
  - cliche
- Supports custom patterns from Layout Settings.
- Settings are persisted via backend (`style_check_get` / `style_check_set`).

## POS Highlighting

- Implemented in `src/editor/pos-highlighting.ts`.
- Uses `wink-nlp` + `wink-eng-lite-web-model`.
- Toggle is managed in app state and applied as CodeMirror decorations.

## Focus Mode Interaction

In focus mode, style check rendering is intentionally suppressed by selector-derived presentation settings.
