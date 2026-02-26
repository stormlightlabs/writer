---
title: "Writing & NLP"
last_updated: 2026-02-23
---

## Scope

- The current "grammar checking" system is rule-based style checking, not a full grammar parser/LLM.
- It runs entirely on the frontend for immediate feedback and low latency.
- There are two writer-NLP features today:
- Style Check (pattern flags)
- Parts-of-Speech (POS) highlighting

## Style Check

### What It Does

- Highlights weak phrasing in the editor (fillers, redundancies, clichés) with non-destructive decorations.
- Uses strikethrough styling only; it does not modify document text automatically.
- Supports optional replacement suggestions on matched patterns.

### How It Works

- Core extension: `src/editor/style-check.ts` (CodeMirror `ViewPlugin`).
- Dictionaries are loaded from `src/data/style-dictionaries.json`.
- Matching engine is `PatternMatcher` (`src/editor/pattern-matcher.ts`) using Aho-Corasick for efficient multi-pattern scanning.
- Matching characteristics:
- Case-insensitive
- Word-boundary aware to avoid partial-word false positives
- Supports multi-word patterns and overlapping matches
- Scans visible editor ranges (viewport-based), then emits decorations and optional `onMatchesChange` callbacks.

### Categories and Custom Patterns

- Built-in categories: `filler`, `redundancy`, `cliche`.
- Users can enable/disable categories and add/remove custom patterns from the Layout Settings panel.
- Custom pattern input is normalized to lowercase before storage (`AddPatternForm`).

### Editor Integration

- The extension is attached in `src/components/Editor.tsx` when `styleCheckSettings.enabled` is true.
- Theme classes:
- `.style-filler` (orange)
- `.style-redundancy` (yellow)
- `.style-cliche` (red)
- Focus mode intentionally disables style-check rendering in panel selectors (`src/state/panel-selectors.ts`) via an override settings object.

### Persistence

- Style-check settings are persisted through Tauri commands:
- `style_check_get` / `style_check_set` (`src-tauri/src/commands.rs`)
- Stored in SQLite `app_settings` as key `style_check` (`crates/store/src/lib.rs`)
- Runtime hydration/persistence sequence is documented in [`docs/lifecycle.md`](./lifecycle.md).

## POS Highlighting

### What It Does

- Colors tokens by grammatical role to support prose analysis (noun/verb/adjective/adverb/conjunction classes).

### How It Works

- Implementation: `src/editor/pos-highlighting.ts`.
- Uses `wink-nlp` + `wink-eng-lite-web-model`, loaded lazily on first use.
- Runs over a buffered viewport window for responsiveness, then applies CodeMirror decorations by POS class.

### Persistence

- POS toggle is part of app runtime state (`posHighlightingEnabled` in Zustand).
- It is currently not persisted to backend settings.

## State Boundaries

- Runtime UI/state source: Zustand (`src/state/stores/app.ts`).
- Search state is separate (Jotai) and unrelated to writer NLP.
- Persistence for NLP-related settings currently covers style-check only; POS state remains session-scoped.
