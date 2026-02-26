# Writer

Writer is a Tauri desktop writing app with a React frontend and a Rust backend.

## Highlights

- Markdown-focused editor with live preview
- Split/editor/preview modes with resizable panes
- Focus mode with typewriter scrolling and dimming
- Rule-based writing assistance (style check + POS highlighting)
- Workspace model built around user-selected folders (locations)
- Quick Capture window route (`#/quick-capture`)
- PDF export via Markdown AST + React PDF rendering

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Zustand, CodeMirror 6, Tailwind CSS
- Backend: Tauri 2, Rust workspace (`core`, `markdown`, `store`)
- Testing: Vitest + Testing Library (frontend), `cargo test` (Rust)

## Development

```sh
pnpm install
pnpm tauri dev
```
