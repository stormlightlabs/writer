---
title: "State Management"
last_updated: 2026-02-23
---

## React

### Zustand

- `src/state/appStore.ts` is the main client state container.
- It is organized as composable slices (layout, editor presentation, view mode,
  writer tools, workspace, tabs, PDF export) and merged into one `useAppStore`.
- Domain actions in the store are intentionally cross-slice when needed
  (for example, tab actions also update `selectedLocationId` / `selectedDocPath` to keep the workspace in sync).
- Most components consume focused selector hooks (`useLayoutChromeState`, `useTabsState`, etc.)
  that use `useShallow` to reduce rerenders.
- `resetAppStore()` exists for deterministic test/app reset behavior.

### Jotai

- Jotai is used for search UI state in `src/state/searchAtoms.ts`.
- Atoms hold query/results/loading/filters plus simple derived/reset atoms.
- This state is intentionally separate from Zustand because search interactions
  are localized and ephemeral.

### Elmish/Ports

- `src/ports.ts` is the frontend/backend boundary and follows an Elmish-style
  command model:
  - `Cmd` describes work (`Invoke`, `StartWatch`, `StopWatch`, `Batch`, `None`).
  - `runCmd()` interprets commands and calls Tauri `invoke`/event APIs.
  - Command builders (`locationList`, `docOpen`, `uiLayoutSet`, etc.) keep payload/typing
    and error normalization centralized.
  - Hooks like `useWorkspaceSync`, `useSearchController`, and `useWorkspaceController`
    orchestrate effects by dispatching commands and writing results into store/atoms.

### Globals

- A few module-scoped values are used for non-UI implementation details:
- `nextTabId` in `src/state/appStore.ts` generates runtime tab ids and is reset
  by `resetAppStore()`.
- Request/version refs in hooks (for example `documentRequestRef` in `useWorkspaceSync`)
  prevent stale async responses from overwriting newer state.
- These are not persisted and are intentionally outside reactive state.

## Tauri

### State

- Backend shared state is `AppState` in `src-tauri/src/commands.rs`.
- It contains:
  - `store: Arc<Store>` (SQLite-backed domain store in `crates/store`)
  - `watchers: Mutex<HashMap<i64, RecommendedWatcher>>` (active filesystem watchers per location)

### Commands

- Tauri commands are the backend API surface (`location_*`, `doc_*`, `search`, `watch_*`, `ui_layout_*`, `style_check_*`, `markdown_*`).
- Startup in `src-tauri/src/lib.rs` initializes plugins + store, manages `AppState`, and runs reconciliation.
- In practice, frontend flow is:
  - user action -> command builder (`ports.ts`) -> `runCmd` -> Tauri command -> result/event -> React state update.
