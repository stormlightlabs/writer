# Validation

## Repo skeleton, contracts, and fixtures

- [ ] CI runs Rust unit tests for markdown fixtures
- [ ] CI runs UI typecheck + lint
- [ ] "Hello command" roundtrip: UI invokes `ping` and prints result

## Location system + permissions + persisted access

- [ ] Add location → restart app → still lists location and can read a test file within it
- [ ] Attempt open outside location root → must fail with a structured error

## Rust command layer "ports" + event channel

- [ ] Trigger a backend event (e.g. "tick") and see it update UI state without direct UI polling

## Document catalog + safe IO + atomic saves

- [ ] Kill app mid-save: file is either old or new, never truncated/partial
- [ ] Modify file externally; open in app; verify reload prompt or auto-reconcile

## Markdown engine (Rust): parse, render, and metadata extraction

- [ ] Run fixture suite covering:
    - [ ] Tables, tasklists, autolinks
    - [ ] Nested blockquotes, code fences
    - [ ] "Raw HTML" cases (ensure safe behavior by default)

## Editor MVP (React): CodeMirror 6 + Markdown language + Elm integration

- [ ] Open a 200 KB markdown file and type smoothly
- [ ] No infinite loops between editor updates and Elm state reconciliation

## Preview renderer + scroll/selection sync

- [ ] Cursor on heading → preview scrolls to that heading block
- [ ] Scrolling preview updates "current section" indicator in editor

## Indexing + search (SQLite FTS)

- [ ] Delete `app.db` → app still opens docs → "Rebuild index" works
- [ ] Modify file externally → index updates and search finds new content

## Markdown "thoroughness" upgrades (extensions, diagnostics, export)

- [ ] "Export HTML" matches preview output exactly
- [ ] Diagnostics appear deterministically for fixtures

## Hardening

- [ ] Load 10k-note library (or synthetic corpus) and keep UI responsive
- [ ] Fuzz-ish tests for markdown parser inputs (crash-free)
