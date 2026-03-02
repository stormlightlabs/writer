# Writer

Writer is a Tauri desktop writing app with a React frontend and a Rust backend.

![Split-pane markdown editor with live preview](www/src/static/images/split-pane-editor.png)

## Highlights

- Markdown-focused editor with live preview
- Split/editor/preview modes with resizable panes
- Focus mode with typewriter scrolling and dimming
- Rule-based writing assistance (style check + POS highlighting)
- Workspace model built around user-selected folders (locations)
- Quick Capture window route (`#/quick-capture`)
- PDF export via Markdown AST + React PDF rendering

### Style Check

Real-time style feedback with inline decorations for filler words, redundancies, and clichés.

![Style check highlighting in the editor](www/src/static/images/style-check-decorations.png)

### Focus Mode

Typewriter scrolling and paragraph dimming for distraction-free writing.

![Focus mode with paragraph dimming](www/src/static/images/focus-mode-with-dimming.png)

### Quick Capture

Global hotkey opens a capture window from anywhere on your system.

![Quick capture window](www/src/static/images/quick-capture.png)

### PDF Export

Configurable page layout with inline preview before exporting.

![PDF export dialog](www/src/static/images/pdf-export.png)

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Zustand, CodeMirror 6, Tailwind CSS
- Backend: Tauri 2, Rust workspace (`core`, `markdown`, `store`)
- Testing: Vitest + Testing Library (frontend), `cargo test` (Rust)

## Development

```sh
pnpm install
pnpm tauri dev
```
