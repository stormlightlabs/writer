# Releasing Writer

Releases are built and published automatically by GitHub Actions using
[tauri-apps/tauri-action](https://github.com/tauri-apps/tauri-action).

## Workflow

1. **Tag a version** - push a semver Git tag prefixed with `v`.
2. `release.yml` runs on every `v*` tag push. It
   builds native binaries for **macOS** (ARM + Intel), **Linux** (Ubuntu), and
   **Windows** in parallel, then uploads them to a GitHub Release.
3. The created release is a **draft** so you can review and
   edit the notes before publishing.

## Tagging a Release

```sh
# Bump the version in both package.json AND src-tauri/tauri.conf.json first, then:
git add -A && git commit -m "chore: release v0.2.0"
git tag v0.2.0
git push && git push --tags
```

> The action replaces `__VERSION__` in the tag / release name with the version
> from `tauri.conf.json`, so the tag format **must** stay `v__VERSION__` (i.e.
> `v0.2.0`).

## Build Matrix

| Runner            | Target                  | Output                       |
|-------------------|-------------------------|------------------------------|
| `macos-latest`    | `aarch64-apple-darwin`  | `.dmg`, `.app`               |
| `macos-latest`    | `x86_64-apple-darwin`   | `.dmg`, `.app`               |
| `ubuntu-22.04`    | default                 | `.deb`, `.rpm`, `.AppImage`  |
| `windows-latest`  | default                 | `.msi`, `.exe` (NSIS)        |

## Workflow File

[`.github/workflows/release.yml`](../.github/workflows/release.yml)

See that file for the full configuration. Key points:

- Uses `pnpm` (matches the project).
- Installs Rust stable with macOS cross-compile targets.
- Installs Ubuntu system deps (`libwebkit2gtk-4.1-dev`, etc.).
- Passes `--target` args only on macOS runners.
- Creates the release as a **draft** (`releaseDraft: true`).

## Secrets

Only the built-in `GITHUB_TOKEN` is required (automatically provided by GitHub
Actions). No additional secrets need to be configured.

## After the Workflow Runs

1. Go to **Releases** in the repository.
2. Find the new draft release.
3. Edit the release notes as needed.
4. Click **Publish release**.
