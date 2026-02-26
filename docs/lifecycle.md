# App Lifecycle

This document is the canonical runtime lifecycle reference for the desktop app.
Architecture/state/pdf docs intentionally avoid duplicating this sequence.

## 1. Process Boot and Route Selection

Entry point: `src/main.tsx`.

At startup, the frontend:

1. Initializes frontend logging.
2. Installs global error handlers (`error`, `unhandledrejection`).
3. Reads the current Tauri window label via `getCurrentWindow().label`.
4. Applies an initial hash route with `applyInitialRoute(windowLabel)`.
5. Renders `AppRouter`.

Router: `src/routes/AppRouter.tsx` (hash router).

- `#/` -> `App` (main editor app).
- `#/quick-capture` -> `QuickCaptureApp` (compact capture window).
- fallback -> not-found route.

## 2. Main App Mount (`App`)

Primary composition root: `src/App.tsx`.

On mount, `App` sets up:

- Editor state machine (`useEditor`).
- Preview orchestration (`usePreview`).
- Workspace synchronization (`useWorkspaceSync`).
- Layout hotkeys (`useLayoutHotkeys`).
- Workspace/document/tab actions (`useWorkspaceController`).
- Typing activity tracking (`useTypingActivity`).

## 3. Settings Hydration and Persistence Loop

Hydration effect (runs once):

- `uiLayoutGet` -> layout/editor/focus settings.
- `styleCheckGet` -> writer tools style-check settings.
- `globalCaptureGet` -> quick-capture settings atom.

After hydration (`layoutSettingsHydrated = true`):

- UI/layout changes are persisted via `uiLayoutSet`.
- Style-check changes are persisted via `styleCheckSet`.

This protects against writing defaults before persisted values load.

## 4. Workspace and Document Restore Lifecycle

Startup restore runs once when:

- locations are loaded,
- at least one location exists,
- no tabs are open yet.

Restore sequence:

1. `sessionLastDocGet`.
2. Validate location exists.
3. `docExists` for the remembered file.
4. If valid, select/open that document tab.
5. Otherwise, create a fallback blank draft tab.

After restore completes, active doc references are saved with `sessionLastDocSet`.

## 5. Active Tab and Editor Lifecycle

`App` reacts to active tab changes:

- Calls `openDoc(activeDocRef)` to load editor content.
- Updates preview source doc (`setPreviewDoc`).
- Debounced markdown preview render (`renderPreview`) after 300ms text changes.
- Marks active tab modified state from editor save status (`Dirty` -> modified badge).

Save lifecycle:

1. If current buffer has no `docRef`, create draft path in selected location.
2. Dispatch `SaveRequested`.
3. Port command executes `doc_save`.
4. Save status transitions (`Saving` -> `Saved`/`Error`).

## 6. UI State Lifecycle (Jotai + Zustand)

UI state now uses both stores:

- Zustand (`src/state/stores/app.ts`): structural app/workspace/editor/view/persisted settings and PDF export status.
- Jotai (`src/state/atoms/*.ts`): localized UI orchestration state.

Current Jotai UI atoms:

- `layoutSettingsOpenAtom`: settings panel visibility.
- `pdfExportDialogOpenAtom`: PDF dialog visibility.
- `pdfExportOptionsAtom`: PDF dialog options (session scoped).
- `globalCaptureSettingsAtom`: quick-capture settings mirror used by UI.
- `setQuickCaptureEnabledAtom`: optimistic quick-capture toggle with rollback on persist failure.
- search atoms in `src/state/atoms/search.ts` for search query/results/filters/loading.

## 7. Search Overlay Lifecycle

Search overlay flow:

1. Header toggles search visibility through layout chrome state.
2. `SearchOverlay` uses `useSearchController`.
3. Controller debounces query, calls `searchDocuments`, and guards stale responses.
4. Selecting a hit opens/selects the target tab and closes overlay.

## 8. PDF Export Lifecycle

Open and execute:

1. Toolbar opens dialog (`pdfExportDialogOpenAtom`) only if an active tab exists.
2. Dialog options are edited through `pdfExportOptionsAtom`.
3. Export click requests backend AST (`renderMarkdownForPdf`).
4. `usePdfExport` renders PDF (`@react-pdf/renderer`) and writes via Tauri dialogs/fs plugin.
5. Export state (`isExportingPdf`, `pdfExportError`) is tracked in Zustand PDF slice.
6. On cancel/close, dialog closes and PDF export status resets.

## 9. Quick Capture Route Lifecycle

`QuickCaptureApp` (`#/quick-capture`):

1. Loads global capture settings with `globalCaptureGet`.
2. Submits capture via `globalCaptureSubmit`.
3. Closes the window when backend result indicates `shouldClose`.

This route is intended for the dedicated quick-capture Tauri window.

## 10. Error and Diagnostics Lifecycle

Runtime diagnostics are continuously handled by:

- frontend logger initialization,
- global JS error/rejection handlers,
- backend event alerts (`BackendAlerts`) for missing locations and conflicts.
