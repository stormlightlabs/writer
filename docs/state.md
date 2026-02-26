---
title: "State Management"
last_updated: 2026-02-26
---

## Frontend State Model

Writer currently uses a single Zustand store (`src/state/stores/app.ts`).

No Jotai atoms are used in the current codebase.

## Store Slices

The store is composed from slice creators for:

- layout chrome state/actions
- editor presentation state/actions
- view mode state/actions
- writer tools state/actions
- workspace locations state/actions
- workspace documents state/actions
- tabs state/actions
- PDF export state/actions
- UI state/actions (layout settings dialog, PDF dialog, global capture settings)

## Selector Layer

`src/state/selectors.ts` exposes narrow hooks to keep components decoupled from raw store shape.

Examples:

- `useToolbarState`
- `useSidebarState`
- `useEditorPresentationState`
- `useLayoutSettingsUiState`
- `useWorkspaceLocationsState`
- `useWorkspaceDocumentsState`

## State Boundaries

- Structural app/workspace/editor state lives in Zustand.
- Backend side effects are triggered through ports/controller hooks, not from low-level presentational components.

## Backend State

Tauri shared backend state (`AppState`) stores:

- persistent `Store`
- active filesystem watchers map

This state is managed in Rust (`src-tauri/src/commands.rs`) and accessed via Tauri commands/events.
