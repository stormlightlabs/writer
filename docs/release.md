# Releasing Commonplace

Releases are produced by GitHub Actions workflow:

- [`.github/workflows/release.yml`](../.github/workflows/release.yml)

## Triggers

- Push a `v*` tag (for example `v0.2.0`).
- Or run the workflow manually through `workflow_dispatch`.

## What the Workflow Does

- Builds platform artifacts on macOS (arm64 + x64), Linux, and Windows.
- On macOS, validates the required Apple secrets, imports the Developer ID certificate into a temporary keychain, resolves the signing identity, and passes notarization credentials to Tauri.[^1][^2]
- Runs `tauri-apps/tauri-action`.
- Creates a draft GitHub Release with uploaded binaries.
- Produces signed/notarized macOS artifacts when the Apple secrets are configured.

## Required GitHub Secrets

- `APPLE_CERTIFICATE`: base64-encoded exported `.p12` certificate
- `APPLE_CERTIFICATE_PASSWORD`: password used when exporting the certificate
- `APPLE_ID`: Apple account email used for notarization
- `APPLE_PASSWORD`: app-specific password for the Apple account
- `APPLE_TEAM_ID`: Apple Developer Team ID

The workflow resolves `APPLE_SIGNING_IDENTITY` from the imported certificate at runtime instead of committing a fixed identity to [`src-tauri/tauri.conf.json`](../src-tauri/tauri.conf.json). Tauri also supports inferring that identity directly from `APPLE_CERTIFICATE`, but the explicit resolution step makes CI failures easier to diagnose.[^2]

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
5. Confirm the Apple signing/notarization secrets above are configured in the repository before pushing a release tag.

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

[^1]: [Tauri macOS code signing and notarization](https://v2.tauri.app/distribute/sign/macos/)
[^2]: [Tauri environment variables reference](https://v2.tauri.app/reference/environment-variables/)
