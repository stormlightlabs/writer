---
title: Documentation - Writer
description: Getting started with Writer markdown editor
template: page
---

# Documentation

## Getting Started

Writer is a local-first markdown editor. On first launch you'll see an empty workspace - here's how to get going.

### Adding a Workspace

Hit the folder icon in the sidebar and point it at any folder on your system. Writer will index the markdown files inside it.

```text
📁 Your Folder
├── notes/
│   └── idea.md
├── draft.md
└── readme.md
```

### Creating Documents

Right-click in the sidebar or use the toolbar to create a new markdown file. Documents save directly to your filesystem - no intermediate database, no proprietary format.

---

## Editor Layout

Writer gives you three layout modes:

- **Editor Only** - Full-width markdown editing
- **Preview Only** - Read the rendered output
- **Split Panes** - Side-by-side editing and preview

Switch between them using the toolbar or keyboard shortcuts. The divider between panes is draggable so you can set whatever ratio feels right.

---

## Focus Mode

Focus mode strips away distractions so you can stay in flow:

- Typewriter scrolling keeps your cursor centered on screen
- Dimming fades surrounding text so you're focused on the current section
- Style check decorations are hidden to keep the view clean

Toggle focus mode from the View menu or with a keyboard shortcut.

---

## Style Check

Writer highlights potential style issues in real-time:

- **Filler words** - very, really, just, and similar
- **Redundancies** - "advance planning", "basic fundamentals"
- **Clichés** - Overused phrases that could be fresher

Hover over a highlight to see what was flagged. You can also add your own custom patterns to match a specific style guide. If style check isn't your thing, it's easy to turn off in settings.

![Style check in action](https://placehold.co/700x437/161616/ee5396?text=Style+Check)

---

## Quick Capture

Set a global hotkey in settings and you can pop open the capture window from anywhere on your system - no need to switch to Writer first.

### Capture Modes

- **Quick Note** - Creates a timestamped file in your inbox folder
- **Append** - Adds text to an existing document you choose
- **Writing Session** - Creates a note and opens it right in the main editor

---

## PDF Export

When you need to share something outside of markdown:

1. Open the document you want to export
2. Go to File → Export PDF
3. Set page size, margins, and fonts
4. Export

---

## Keyboard Shortcuts

| Shortcut               | Action                       |
| ---------------------- | ---------------------------- |
| `Cmd/Ctrl + N`         | New document                 |
| `Cmd/Ctrl + O`         | Open workspace folder        |
| `Cmd/Ctrl + S`         | Save (auto-saves by default) |
| `Cmd/Ctrl + F`         | Find in document             |
| `Cmd/Ctrl + \`         | Toggle sidebar               |
| `Cmd/Ctrl + 1/2/3`     | Switch layout mode           |
| `Cmd/Ctrl + Shift + C` | Quick capture                |
