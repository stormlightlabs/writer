# Releasing Writer

Releases are produced by GitHub Actions workflow:

- [`.github/workflows/release.yml`](../.github/workflows/release.yml)

## Triggers

- Push a `v*` tag (for example `v0.2.0`).
- Or run the workflow manually through `workflow_dispatch`.

## What the Workflow Does

- Builds platform artifacts on macOS (arm64 + x64), Linux, and Windows.
- Runs `tauri-apps/tauri-action`.
- Creates a draft GitHub Release with uploaded binaries.

## Before Tagging

1. Update the release version in:
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
2. Finalize `CHANGELOG.md`.
3. Run release validation locally:
   - `pnpm lint`
   - `pnpm check`
   - `pnpm test:run`
   - `pnpm build`
   - `cargo test`
4. Confirm the intended tag matches the app version exactly.

## Triggering A Release

### Tag push

Push a semver tag such as `v0.2.0` from the commit you want to release.

### Manual dispatch

Use `workflow_dispatch` when you want to rebuild or re-run the release workflow for an already-prepared release commit.

When using manual dispatch, make sure:

- the checked-out commit already contains the final version bump
- `CHANGELOG.md` is finalized
- the intended GitHub Release should still correspond to the same version/tag

## After Build

1. Open GitHub Releases.
2. Review the draft release artifacts for all platforms.
3. Review the generated release title and notes.
4. Smoke-test at least one packaged build from the draft artifacts.
5. Publish the draft.
