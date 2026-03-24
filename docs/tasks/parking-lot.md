---
title: "Parking Lot"
description: >
    A collection of ideas/proposals for new features and quick bug notes.
updated: 2026-03-23
---

1. **CJK Font Support** ✅

   Maple Mono (4 TTF weights, ~1.1 MB bundled) is now the CJK-capable font. `@react-pdf/renderer` has no fallback chains[^4] — CJK fonts must be registered and selected explicitly.

   **Remaining:** Noto Sans CJK SC (~16 MB) — requires on-demand Tauri download to avoid bundle bloat. Noto SC/JP/KR woff2 subsets are loaded for editor display only via `@fontsource`.

   - [x] Bundle Maple Mono TTF in `public/fonts/` (`maple-mono-{400,700}-{normal,italic}.ttf`)
   - [x] Extend `FontName` (`src/pdf/types.ts`), `EditorFontFamily` (`src/types.ts`), `FONT_PATHS` + `BUILTIN_FONT_FAMILY_MAP` (`src/pdf/fonts.ts`)
   - [x] Add `@font-face` rules in `src/styles/fonts.css`; import Noto SC/JP/KR subsets for editor
   - [x] Add `FontConfig` entries in `src/pdf/fonts.ts`
   - [x] Add Maple Mono to `EDITOR_FONT_OPTIONS` (`FontRows.tsx`)
   - [x] `hasCjkContent` + `resolvePdfFont` in `src/pdf/fonts.ts`; auto-switch to Maple Mono when Latin-only font + CJK detected; `PdfCjkWarning` banner in ExportOptions
   - [ ] Noto Sans CJK SC PDF support — on-demand Tauri download command (separate ticket)

2. **Corrupted DMG / Gatekeeper quarantine**[^5][^6]

   `release.yml` passes no Apple signing secrets to `tauri-action`[^7]; `tauri.conf.json` has no `macOS` signing block. Gatekeeper quarantines the unsigned DMG.

   **Subtasks:**
   - [ ] Obtain Apple Developer credentials (Developer ID cert `.p12`, Apple ID, app-specific password, Team ID)
   - [ ] Add GitHub secrets: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`
   - [ ] Pass secrets as env vars to `tauri-apps/tauri-action` in `release.yml`
   - [ ] Add `bundle.macOS.signingIdentity` to `tauri.conf.json`
   - [ ] Verify with `spctl --assess` after a test release
   - [ ] Interim: add `xattr -c` workaround to release notes
3. **Outline utilization**
   - Use Rust-generated `metadata.outline` from `markdown_render` in the UI for document structure navigation/jump-to-heading behavior
4. **Perf**
   - Incremental render scheduling (debounce, worker thread)
   - Indexing in background with progress events with UI feedback
5. **Recovery**
   - Corrupt settings/workspace → app resets safely
   - Missing location root → UI prompts to relink/remove

---

- We should let users distinctly pick editor and PDF font in settings and export

[^1]: [Noto Sans CJK — Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+SC)
[^2]: [Maple Mono — GitHub](https://github.com/subframe7536/maple-font)
[^3]: [IBM Plex CJK coverage gap](https://github.com/IBM/plex/issues/148) — IBM Plex does not include CJK glyphs.
[^4]: [`@react-pdf/renderer` font registration — no fallback chain](https://react-pdf.org/fonts#register)
[^5]: [Apple Gatekeeper and notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
[^6]: [`xattr -c` workaround for quarantined DMGs](https://support.apple.com/en-us/102445)
[^7]: [`tauri-apps/tauri-action` signing docs](https://v2.tauri.app/distribute/sign/macos/)
