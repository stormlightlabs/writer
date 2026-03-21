---
title: "State Management"
last_updated: 2026-03-21
---

## Frontend State Model

Writer uses multiple Zustand stores organized by domain under `src/state/stores/`.

## Store Slices

Current runtime stores:

- `layout.ts`
  - layout chrome
  - editor presentation
  - view mode
  - writer tools
- `workspace.ts`
  - locations
  - selected location documents/directories
  - per-location sidebar document/directory caches
  - persisted expanded location/directory state
  - sidebar drag/drop state
- `tabs.ts`
  - open tabs
  - active tab
  - session hydration status
- `pdf-export.ts`
- `text-export.ts`
- `docx-export.ts`
- `search.ts`
- `ui.ts`
  - layout settings sheet
  - export dialog options
  - global capture settings
- `shortcuts.ts`
- `toasts.ts`

`src/state/stores/app.ts` now exposes a merged `useAppStore()` facade by combining the domain stores above. It is useful when a single aggregate app shape is needed, but it is not the primary authoring model.

## Selector Layer

`src/state/selectors.ts` exposes narrow hooks to keep components decoupled from raw store shape.

Examples:

- `useLayoutChromeState`
- `useEditorPresentationState`
- `useWorkspaceLocationsState`
- `useWorkspaceDocumentsState`
- `useTabsState`
- `useLayoutSettingsUiState`
- `usePdfDialogUiState`
- `useGlobalCaptureSettingsState`

## State Boundaries

- Structural UI, workspace, tab, export, and settings state lives in Zustand.
- Backend side effects are triggered through ports/controller hooks, not from low-level presentational components.
- Persistent settings are hydrated from Rust/Tauri commands and written back through controller/effect hooks.

## Backend State

Tauri shared backend state (`AppState`) stores:

- persistent `Store`
- active filesystem watchers map

This state is managed in Rust (`src-tauri/src/commands.rs`) and accessed via Tauri commands/events.
