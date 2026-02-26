---
title: "Writer Product Spec"
last_updated: 2026-02-26
---

## Product Intent

Writer is a desktop markdown writing environment optimized for local-first authoring with robust folder-based workspaces.

## Core Principles

- Local-first files: user-selected folders are authoritative.
- Fast feedback: live preview and lightweight writing assistance.
- Defensive behavior: graceful handling for missing paths, command failures, and partial IO issues.
- Predictable controls: explicit layout/view state through centralized store selectors.

## Current Capabilities

- Location library (add/remove/select folders)
- Document listing/open/save flows
- Document tabs + active tab model
- Editor-only, preview-only, and split layouts
- Focus mode panel
- Search command integration
- Global quick capture route/window
- PDF export with configurable output options

## Non-Goals (Current)

- Cloud-synced proprietary storage backend
- AI-generated rewriting built into save path
- Plugin marketplace/runtime

## Quality Bar

- Keep frontend/backend contracts explicit through `src/ports/`.
- Keep data-loss risk minimized via backend save/indexing behavior.
- Keep UI tests deterministic and close to user behavior.
