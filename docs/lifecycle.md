# App Lifecycle

## 1. Bootstrap and Route Selection

Entry point: `src/main.tsx`.

Startup sequence:

1. Initialize frontend logging.
2. Register global `error` and `unhandledrejection` handlers.
3. Read current Tauri window label.
4. Apply hash route (`#/` or `#/quick-capture`).
5. Render `AppRouter`.

## 2. Route Mount

`src/Router.tsx`:

- `#/` -> main app (`App`)
- `#/settings` -> main app with routed settings sheet open
- `#/diagnostics` -> main app with routed diagnostics sheet open
- `#/quick-capture` -> quick capture app (`QuickCaptureApp`)

## 3. Main App Runtime (`App`)

`App` splits orchestration across:

- `useAppChromeController`
  - theme
  - focus mode shell decisions
  - top-level chrome visibility
- `useWorkspaceViewController`
  - workspace sync and selection lifecycle
  - editor state + save behavior
  - preview rendering and editor/preview line sync
  - layout/help hotkeys
  - toolbar/status/sidebar/document tab props
  - export dialog trigger wiring

## 4. Workspace Lifecycle

Core flow via `useWorkspaceSync`, `useWorkspaceController`, and `useDocumentSessionEffects`:

1. Load locations.
2. Start filesystem watchers for active locations.
3. Select an initial location if available.
4. Load documents/directories for the selected location and keep per-location sidebar caches warm for expanded trees.
5. Load Rust-backed session state (`session_get`) and prune tabs for removed locations.
6. Open the active document or create a draft when startup has no restorable tab.
7. Track and refresh sidebar contents for saves, manual refreshes, and external filesystem events.

## 5. Editor + Save Lifecycle

- Editor content and save status are managed via `useEditor` + `useDocumentActions`.
- Save action dispatches `doc_save` through ports.
- Save status transitions drive toolbar/status UI and tab modified state.
- Draft documents are created optimistically with generated untitled paths and become real files on save.

## 6. Preview Lifecycle

- Preview state is managed by `usePreview`.
- Active document text is pushed into the preview pipeline by `useEditorPreviewEffects`.
- Rendering uses the backend `markdown_render` command.
- Preview line sync is maintained from cursor movement and editor bridge events.

## 7. Settings Hydration/Persistence

`useSettingsSync` loads persisted settings and then persists store updates.

Persisted backend settings include:

- UI layout settings
- sidebar tree expansion state
- style-check settings
- global capture settings

## 8. Export Lifecycle

- Export UI lives in `ExportDialog`.
- PDF export requests `markdown_render_for_pdf`, builds a PDF in the frontend, previews it inline, and writes bytes after the user chooses a destination.
- DOCX export requests `markdown_render_for_docx` and writes the returned bytes after destination selection.
- Plaintext export requests `markdown_render_for_text`.
- Markdown source save writes the current editor text directly as `.md`.

## 9. Quick Capture Lifecycle

`QuickCaptureApp`:

1. Loads global capture settings.
2. Loads available locations and directory targets for save destinations.
3. Loads layout settings needed for reduced-motion behavior.
4. Submits capture via backend command.
5. Closes quick capture window when backend returns `shouldClose`.

## 10. Error/Event Lifecycle

- Global JS errors are logged.
- Backend reconciliation and watcher events are emitted by Tauri and consumed by frontend event hooks.
