# Releasing Writer

Releases are produced by GitHub Actions workflow:

- [`.github/workflows/release.yml`](../.github/workflows/release.yml)

## Trigger

Push a `v*` tag (for example `v0.1.1`).

## What the Workflow Does

- Builds platform artifacts on macOS (arm64 + x64), Linux, and Windows.
- Runs `tauri-apps/tauri-action`.
- Creates a draft GitHub Release with uploaded binaries.

## Required Inputs

- Correct app versions in:
  - `package.json`
  - `src-tauri/tauri.conf.json`
- A pushed semver tag matching the intended release.

## After Build

1. Open GitHub Releases.
2. Review draft release artifacts and notes.
3. Publish the draft.
