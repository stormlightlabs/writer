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

`src/routes/AppRouter.tsx`:

- `#/` -> main app (`App`)
- `#/quick-capture` -> quick capture app (`QuickCaptureApp`)

## 3. Main App Runtime (`App`)

`App` delegates orchestration to `useAppController`, which wires:

- workspace sync and selection lifecycle
- editor state + save behavior
- preview rendering and editor/preview line sync
- layout hotkeys and layout controls
- toolbar/status/sidebar/document tab props
- PDF export trigger wiring

## 4. Workspace Lifecycle

Core flow via `useWorkspaceSync` + `useWorkspaceController`:

1. Load locations.
2. Select an initial location if available.
3. Load documents for selected location.
4. Restore/open last document session when possible.
5. Track and refresh sidebar contents for saves and manual refreshes.

## 5. Editor + Save Lifecycle

- Editor content and save status are managed via `useEditor` + `useDocumentActions`.
- Save action dispatches `doc_save` through ports.
- Save status transitions drive toolbar/status UI and tab modified state.

## 6. Preview Lifecycle

- Preview source is updated from active document text.
- Markdown render calls are debounced.
- Preview line sync is maintained from cursor movement.

## 7. Settings Hydration/Persistence

`useSettingsSync` loads persisted settings and then persists store updates.

Persisted backend settings include:

- UI layout settings
- style-check settings
- global capture settings

## 8. Quick Capture Lifecycle

`QuickCaptureApp`:

1. Loads global capture settings.
2. Submits capture via backend command.
3. Closes quick capture window when backend returns `shouldClose`.

## 9. Error/Event Lifecycle

- Global JS errors are logged.
- Backend reconciliation and watcher events are emitted by Tauri and consumed by frontend event hooks.
