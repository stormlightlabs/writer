# Writer spec

## Intent

A focused writing environment that treats **user-chosen folders ("locations")** as the
canonical source of truth (plain-text/Markdown), with a **derived local index** for fast
search, and an **optional sync story** that comes "for free" via iCloud/Dropbox/OneDrive/etc
because the files live in those providers' folders.

Persistence with "library of folders," and sidecar state *for indexes and UI state only*.

## Locations & Persistence

### 3.1 How "Locations" work

- Users add a location by choosing a folder via native dialog (`Open Directory…`).
- The app treats each location as a **root**; all document operations must resolve under a root (no "../../" traversal, no implicit global disk access).

Tauri's **dialog plugin** can open file/directory selectors; selected paths are added to filesystem/asset scopes **for the running session**, but the scope change is **not persisted across restarts** unless you persist it. ([Tauri][3])

### 3.2 Persisting access in Tauri

- Use Tauri's **persisted-scope plugin** so that filesystem/asset scopes added through dialogs (and related APIs) are restored on relaunch. ([Tauri][4])
- Use Tauri **capabilities/permissions** to grant only what you need (dialog open/save, fs read/write/watch within scope). ([Tauri][1])
- Use the **fs plugin's scope configuration** (glob-scoped access) as a second line of defense. ([Tauri][5])

### 3.3 Platform notes

- **macOS App Sandbox / MAS**: persistent access to user-selected folders typically involves **security-scoped bookmarks**; Apple's sandboxing docs explicitly describe using bookmarks that grant access when resolved. ([Apple Developer][6])
    - Practical spec stance: if you plan Mac App Store distribution, design the "Location persistence layer" so it *can* be backed by security-scoped bookmarks; for non-MAS builds, Tauri persisted scope may be sufficient depending on entitlements and packaging.
- **Linux (Flatpak/Snap)**: sandboxed deployments often rely on **XDG portals**; the **Document portal** exposes external files to sandboxed apps via a controlled mount (`/run/user/$UID/doc/…`). ([Flatpak][7])
- **Windows**: sandboxed models (UWP-like) preserve file-picker access using concepts like a **future-access list**; even if you're not UWP, this is a useful conceptual model for "remembering user-granted access." ([Microsoft Learn][8])

**Key design decision:** implement a *Location Access Abstraction* so the rest of the app only deals with `LocationId -> ResolvedPathHandle`, regardless of platform-specific persistence.

## UX

### Library (Locations-first)

- Sidebar shows:
    - Locations (root folders)
    - Within each: folders + documents tree (optional), or flat list with filters
- "Add Location…" opens folder picker (directory selection). ([Tauri][9])

### Editor

- Split view
- Focus modes:
    - typewriter scroll
    - distraction-free
- Autosave:
    - default on (debounced)
    - status indicator: Saved / Saving / Error

### Search

- Global search across all locations with filters
- Search results open file at match; highlight match ranges

## Testing & verification

1. **Location persistence**
   - Add a location, restart the app, verify you can still read/write within it without re-adding. (Persisted scope must be enabled.) ([Tauri][3])
2. **Atomic save**
   - Kill the app during save; file must be either old version or new version, never partial.
3. **Index rebuild**
   - Delete `app.db`; app still opens files; search becomes available after rebuild.
4. **Scoped access enforcement**
   - Attempt to open a path outside locations; app must refuse.
5. **Cross-provider sanity**
   - Use a location under iCloud/Dropbox/OneDrive; create/edit from another device; verify watcher/reconcile updates index and surfaces conflicts.

## Parking Lot

- Cloud sync service
- Zettlekasten features/Obsidian-like graph features
- Plugin interface

## Notes

If you truly want "OS locations" in a way that survives sandboxed distribution, treat "persisted access" as a **first-class subsystem** (with platform backends):

- Tauri persisted scopes are the ergonomic default. ([Docs.rs][10])
- macOS sandboxed distribution requires planning for **security-scoped bookmarks** as the durable permission token. ([Apple Developer][6])
- Flatpak/Snap often route access through **portals/document portal**. ([Flatpak][7])

[1]: https://v2.tauri.app/security/capabilities/ "Capabilities"
[3]: https://v2.tauri.app/reference/javascript/dialog/ "tauri-apps/plugin-dialog"
[4]: https://v2.tauri.app/plugin/persisted-scope/ "Persisted Scope"
[5]: https://v2.tauri.app/reference/javascript/fs/ "@tauri-apps/plugin-fs | Tauri"
[6]: https://developer.apple.com/documentation/security/accessing-files-from-the-macos-app-sandbox "Accessing files from the macOS App Sandbox"
[7]: https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.Documents.html "XDG Desktop Portal documentation"
[8]: https://learn.microsoft.com/en-us/uwp/api/windows.storage.accesscache.storageitemaccesslist?view=winrt-26100 "StorageItemAccessList Class - Windows"
[9]: https://v2.tauri.app/plugin/dialog/ "Dialog"
[10]: https://docs.rs/tauri-plugin-persisted-scope "tauri_plugin_persisted_scope - Rust"
