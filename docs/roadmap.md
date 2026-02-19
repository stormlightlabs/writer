# Roadmap

## Location system + permissions + persisted access

Users add folders ("locations"), and access persists across restarts—without granting broad filesystem access.

- Use **Tauri capabilities** to scope permissions and limit plugin access. ([Tauri][2])
- "Add location" via **folder picker** (dialog plugin), then persist the granted scope (persisted-scope plugin recommended). ([CodeSandbox][3])

### Tasks

1. **Domain model**
   - `LocationId`, `LocationDescriptor { id, name, root_path, added_at }`
   - `DocRef { location_id, rel_path }`
2. **Rust commands**
   - `location_add_via_dialog() -> LocationDescriptor`
   - `location_list() -> Vec<LocationDescriptor>`
   - `location_remove(LocationId)`
3. **Scope enforcement**
   - Canonicalize + reject path traversal
   - All doc ops require `DocRef`, never arbitrary absolute paths
4. **Reconcile on startup**
   - Validate roots still exist
   - Emit events for missing/changed locations

## Rust command layer "ports" + event channel

A stable backend API surface that the Elm-style frontend treats as "ports".

### Tasks

1. **Command contract design**
   - Standard response envelope:
        - `Ok(T)` / `Err(AppError { code, message, context })`
   - Error codes: `NotFound`, `PermissionDenied`, `InvalidPath`, `Io`, `Parse`, `Index`, `Conflict`
2. **Tauri command + event plumbing**
   - Implement command handlers (`#[tauri::command]`)
   - Implement a global event emitter for backend → frontend push events (file watcher, indexing progress). ([Tauri][4])
3. **Frontend Elm core**
   - `Cmd` variants:
      - `Cmd::Invoke(command, payload, onOk, onErr)`
      - `Cmd::StartWatch(location_id)`
   - `Sub` variants:
      - backend events stream → `Msg::BackendEvent(...)`

## Document catalog + safe IO + atomic saves

Open/edit/save files in locations safely and predictably.

### Tasks

1. **Doc catalog layer**
   - `doc_list(location_id, options) -> Vec<DocMeta>`
   - `doc_open(doc_ref) -> { text, meta }`
2. **Atomic write implementation**
   - Write temp → fsync (where possible) → rename/replace
   - Preserve encoding + line endings policy
3. **Conflict awareness**
   - Detect "conflicted copy" patterns (provider-created duplicates)
   - Treat as a new document; surface in UI as "conflict detected"
4. **Editor autosave loop** (Backend ready, needs UI wiring)
   - Debounced save in Elm (`Msg::EditorChanged` → schedule save `Cmd`)
   - Save status machine: `Idle | Dirty | Saving | Saved | Error`

## Markdown engine (Rust)

A "thorough" Markdown pipeline: deterministic HTML, structured metadata, and source mapping support.

### Engine choice

- **Comrak** for CommonMark + GitHub Flavored Markdown support and configurable extensions. ([Crates.io][1])

### Tasks

1. **Define Markdown profiles**
   - `MarkdownProfile::StrictCommonMark`
   - `MarkdownProfile::GfmSafe` (tables/tasklists/strikethrough/autolinks; disallow unsafe raw HTML)
   - Future: `WikiLinks`, `FrontMatter`, `Math`, etc. (Comrak supports many as extensions). ([GitHub][5])
2. **Rendering safety**
   - Default: `render.unsafe = false`
   - Treat raw HTML as untrusted; if you ever enable "unsafe" rendering, require sanitization / CSP strategy (explicit opt-in). ([Crates.io][1])
3. **Source position mapping**
   - Enable `render.sourcepos` to include source position attributes in HTML output (useful for editor↔preview sync). ([Docs.rs][6])
4. **Metadata extraction**
   - Extract:
      - title (first H1)
      - headings outline (H1–H6)
      - link refs
      - task items count
      - word count estimate
5. **Golden tests**
   - For each fixture:
      - Markdown → HTML exact match
      - Outline JSON match
      - Sourcepos presence for block nodes

## Editor (React)

A robust text editor that cooperates with Elm state management (no "hidden state surprises").

### Tasks

1. **Editor engine**
   - Use CodeMirror 6 with Markdown language support (`@codemirror/lang-markdown`). ([GitHub][7])
2. **React integration**
   - Wrap CodeMirror in a controlled-ish component:
   - Avoid full "controlled text value" on every keystroke (perf)
   - Instead: editor is the local text buffer, but emits patches / debounced full text into Elm `Model`
3. **Editing features (MVP)**
   - line/selection persistence
   - undo/redo
   - markdown syntax highlighting
   - basic keymap
4. **Elm event design**
   - `Msg::EditorChanged(delta|text)`
   - `Msg::SaveRequested`
   - `Msg::SaveFinished`
   - `Msg::DocOpened`
5. **Oxocarbon Dark & Light themes**
6. **Testing library tests**

## Preview renderer + scroll/selection sync

High-quality Markdown rendering with predictable safety and a stable sync model.

### Tasks

1. **Backend preview command**
   - `markdown_render(doc_ref, text, profile) -> { html, outline, diagnostics }`
   - Cache rendered HTML by `(doc_id, content_hash, profile)`
2. **Frontend preview**
   - Render HTML in a sandboxed container (no inline scripts)
   - Apply CSS theme consistent with editor
3. **Sync strategy**
   - Use `data-sourcepos` (from Comrak sourcepos) to map:
      - editor cursor line → preview anchor
      - preview scroll → nearest sourcepos line
   - Implement coarse sync first (block-level), refine later. ([Docs.rs][6])

## Indexing + search (SQLite FTS)

Fast global search across locations with correct incremental updates (watcher + reconciliation).

### Tasks

1. **SQLite schema**
   - `docs(location_id, rel_path, mtime, size, hash, title, updated_at, …)`
   - `docs_fts(content, tokenize=...)`
2. **Index update pipeline**
   - On save: update FTS row
   - On watcher event: queue reindex for changed file
   - On startup: reconcile catalog vs filesystem (drift repair)
3. **Search API**
   - `search(query, filters, limit) -> SearchHit[]` with snippets

## Markdown "thoroughness" upgrades (extensions, diagnostics, export)

Make Markdown handling feel professional and predictable for writers.

### Tasks

1. **Front matter**
   - Parse YAML/TOML front matter (Comrak supports front matter extension; decide format). ([GitHub][5])
2. **Footnotes, definition lists, tables**
   - Enable and test; ensure preview styles cover them. ([GitHub][5])
3. **Diagnostics**
   - Lint-like warnings:
      - duplicate heading IDs
      - malformed links
      - mixed line endings
4. **Export**
   - HTML export (direct from Rust renderer)
   - PDF export

## Hardening

### Tasks

1. **Security**
   - Prove: no fs access outside scoped locations
   - Prove: preview cannot execute scripts (CSP / sandbox strategy)
2. **Perf**
   - Incremental render scheduling (debounce, worker thread)
   - Indexing in background with progress events
3. **Recovery**
   - Corrupt settings/workspace → app resets safely
   - Missing location root → UI prompts to relink/remove

## References

[1]: https://crates.io/crates/comrak "comrak - crates.io: Rust Package Registry"
[2]: https://v2.tauri.app/develop/calling-rust/ "Calling Rust from the Frontend"
[3]: https://codesandbox.io/s/react-codemirror-example-codemirror-6-markdown-auto-languages-iudnj "react-codemirror-example (codemirror 6) (Markdown auto ...)"
[4]: https://v2.tauri.app/develop/calling-frontend/ "Calling the Frontend from Rust"
[5]: https://github.com/kivikakk/comrak "kivikakk/comrak: CommonMark + GFM compatible ..."
[6]: https://docs.rs/comrak/latest/comrak/options/struct.Render.html "Render in comrak::options - Rust"
[7]: https://github.com/codemirror/lang-markdown "Markdown language support for the CodeMirror code editor"
