use super::AppState;
use notify::event::{ModifyKind, RemoveKind};
use notify::{Event, EventKind};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_fs::FsExt;
use writer_core::{AppError, BackendEvent, DocId, FsChangeKind, FsEntryKind, LocationDescriptor, LocationId};
use writer_store::Store;

fn should_process_watcher_event(kind: &EventKind) -> bool {
    matches!(kind, EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_))
}

pub(super) fn emit_doc_modified_event(app: &AppHandle, doc_id: DocId, mtime: chrono::DateTime<chrono::Utc>) {
    let event = BackendEvent::DocModifiedExternally { doc_id, new_mtime: mtime };
    if let Err(error) = app.emit("backend-event", event) {
        log::error!("Failed to emit DocModifiedExternally event: {}", error);
    }
}

fn relative_path(root_path: &Path, path: &Path) -> Option<PathBuf> {
    match path.strip_prefix(root_path) {
        Ok(rel_path) if !rel_path.as_os_str().is_empty() => Some(rel_path.to_path_buf()),
        _ => {
            let canonical_root = root_path.canonicalize().ok()?;
            match path.strip_prefix(&canonical_root) {
                Ok(rel_path) if !rel_path.as_os_str().is_empty() => Some(rel_path.to_path_buf()),
                _ => {
                    let canonical_path = path.canonicalize().ok()?;
                    canonical_path
                        .strip_prefix(&canonical_root)
                        .ok()
                        .filter(|rel_path| !rel_path.as_os_str().is_empty())
                        .map(Path::to_path_buf)
                }
            }
        }
    }
}

fn emit_filesystem_changed_event(
    app: &AppHandle, location_id: LocationId, entry_kind: FsEntryKind, change_kind: FsChangeKind, rel_path: PathBuf,
    old_rel_path: Option<PathBuf>,
) {
    log::debug!(
        "Emitting FilesystemChanged: location_id={:?}, entry_kind={:?}, change_kind={:?}, rel_path={:?}, old_rel_path={:?}",
        location_id,
        entry_kind,
        change_kind,
        rel_path,
        old_rel_path
    );
    let event = BackendEvent::FilesystemChanged { location_id, entry_kind, change_kind, rel_path, old_rel_path };
    if let Err(error) = app.emit("backend-event", event) {
        log::error!("Failed to emit FilesystemChanged event: {}", error);
    }
}

fn change_kind_from_event_kind(kind: &EventKind) -> FsChangeKind {
    match kind {
        EventKind::Create(_) => FsChangeKind::Created,
        EventKind::Remove(_) => FsChangeKind::Deleted,
        EventKind::Modify(ModifyKind::Name(_)) => FsChangeKind::Renamed,
        EventKind::Modify(_) => FsChangeKind::Modified,
        _ => FsChangeKind::Modified,
    }
}

fn remove_document_from_index_if_present(store: &Store, doc_id: &DocId, path: &Path) {
    if let Err(error) = store.remove_document_from_index(doc_id) {
        log::error!("Failed to remove deleted file {:?} from index: {}", path, error);
    }
}

fn reindex_document_and_emit(
    app: &AppHandle, store: &Store, location_id: LocationId, path: &Path, doc_id: DocId, change_kind: FsChangeKind,
) {
    match store.reindex_document(&doc_id) {
        Ok(()) => {
            let new_mtime = std::fs::metadata(path)
                .and_then(|metadata| metadata.modified())
                .map(chrono::DateTime::<chrono::Utc>::from)
                .unwrap_or_else(|_| chrono::Utc::now());

            emit_doc_modified_event(app, doc_id.clone(), new_mtime);
            emit_filesystem_changed_event(
                app,
                location_id,
                FsEntryKind::File,
                change_kind,
                doc_id.rel_path.clone(),
                None,
            );
        }
        Err(error) => {
            log::error!("Failed to reindex changed file {:?}: {}", path, error);
            if let Err(reconcile_error) = store.reconcile_location_index(location_id) {
                log::error!(
                    "Failed to reconcile index after file change {:?} in location {:?}: {}",
                    path,
                    location_id,
                    reconcile_error
                );
            }
            emit_filesystem_changed_event(
                app,
                location_id,
                FsEntryKind::File,
                change_kind,
                doc_id.rel_path.clone(),
                None,
            );
        }
    }
}

fn reconcile_directory_index_and_emit(
    app: &AppHandle, store: &Store, location_id: LocationId, rel_path: PathBuf, change_kind: FsChangeKind,
    old_rel_path: Option<PathBuf>,
) {
    if let Err(error) = store.reconcile_location_index(location_id) {
        log::error!(
            "Failed to reconcile index after directory change {:?} in location {:?}: {}",
            rel_path,
            location_id,
            error
        );
        return;
    }

    emit_filesystem_changed_event(
        app,
        location_id,
        FsEntryKind::Directory,
        change_kind,
        rel_path,
        old_rel_path,
    );
}

fn handle_rename_event(app: &AppHandle, store: &Store, location_id: LocationId, root_path: &Path, paths: &[PathBuf]) {
    if paths.len() < 2 {
        return;
    }

    let from_path = &paths[0];
    let to_path = &paths[1];

    let Some(old_rel_path) = relative_path(root_path, from_path) else {
        return;
    };
    let Some(new_rel_path) = relative_path(root_path, to_path) else {
        return;
    };

    let is_directory_rename = to_path.is_dir() || from_path.is_dir();
    if is_directory_rename {
        reconcile_directory_index_and_emit(
            app,
            store,
            location_id,
            new_rel_path,
            FsChangeKind::Renamed,
            Some(old_rel_path),
        );
        return;
    }

    let old_doc_id = match DocId::new(location_id, old_rel_path.clone()) {
        Ok(doc_id) => doc_id,
        Err(error) => {
            log::warn!("Ignoring watcher rename source path that failed validation: {}", error);
            return;
        }
    };
    let new_doc_id = match DocId::new(location_id, new_rel_path.clone()) {
        Ok(doc_id) => doc_id,
        Err(error) => {
            log::warn!(
                "Ignoring watcher rename destination path that failed validation: {}",
                error
            );
            return;
        }
    };

    remove_document_from_index_if_present(store, &old_doc_id, from_path);
    match store.reindex_document(&new_doc_id) {
        Ok(()) => {
            let new_mtime = std::fs::metadata(to_path)
                .and_then(|metadata| metadata.modified())
                .map(chrono::DateTime::<chrono::Utc>::from)
                .unwrap_or_else(|_| chrono::Utc::now());
            emit_doc_modified_event(app, new_doc_id.clone(), new_mtime);
            emit_filesystem_changed_event(
                app,
                location_id,
                FsEntryKind::File,
                FsChangeKind::Renamed,
                new_doc_id.rel_path.clone(),
                Some(old_doc_id.rel_path.clone()),
            );
        }
        Err(error) => {
            log::error!("Failed to reindex renamed file {:?}: {}", to_path, error);
            if let Err(reconcile_error) = store.reconcile_location_index(location_id) {
                log::error!(
                    "Failed to reconcile index after file rename {:?} in location {:?}: {}",
                    to_path,
                    location_id,
                    reconcile_error
                );
            }
            emit_filesystem_changed_event(
                app,
                location_id,
                FsEntryKind::File,
                FsChangeKind::Renamed,
                new_doc_id.rel_path.clone(),
                Some(old_doc_id.rel_path.clone()),
            );
        }
    }
}

pub(super) fn handle_watcher_event(
    app: &AppHandle, store: &Arc<Store>, location_id: LocationId, root_path: &Path, event: Event,
) {
    log::debug!(
        "Watcher event received: location_id={:?}, kind={:?}, paths={:?}",
        location_id,
        event.kind,
        event.paths
    );

    if !should_process_watcher_event(&event.kind) {
        log::debug!(
            "Ignoring watcher event for location_id={:?}: unsupported kind={:?}",
            location_id,
            event.kind
        );
        return;
    }

    if matches!(event.kind, EventKind::Modify(ModifyKind::Name(_))) {
        handle_rename_event(app, store, location_id, root_path, &event.paths);
        return;
    }

    let change_kind = change_kind_from_event_kind(&event.kind);

    for path in event.paths {
        let rel_path = match relative_path(root_path, &path) {
            Some(rel_path) => rel_path,
            None => continue,
        };

        if path.exists() && path.is_dir() {
            reconcile_directory_index_and_emit(app, store, location_id, rel_path, change_kind, None);
            continue;
        }

        let doc_id = match DocId::new(location_id, rel_path.clone()) {
            Ok(doc_id) => doc_id,
            Err(error) => {
                log::warn!("Ignoring watcher path that failed validation: {}", error);
                continue;
            }
        };

        if path.exists() && path.is_file() {
            reindex_document_and_emit(app, store, location_id, &path, doc_id, change_kind);
            continue;
        }

        if !path.exists() {
            let is_directory_delete = matches!(event.kind, EventKind::Remove(RemoveKind::Folder));
            if is_directory_delete {
                reconcile_directory_index_and_emit(app, store, location_id, rel_path, FsChangeKind::Deleted, None);
                continue;
            }

            remove_document_from_index_if_present(store, &doc_id, &path);
            emit_doc_modified_event(app, doc_id.clone(), chrono::Utc::now());
            emit_filesystem_changed_event(
                app,
                location_id,
                FsEntryKind::File,
                FsChangeKind::Deleted,
                doc_id.rel_path.clone(),
                None,
            );
        }
    }
}

pub(super) fn paths_match(expected: &Path, actual: &Path) -> bool {
    if expected == actual {
        return true;
    }

    match (expected.canonicalize(), actual.canonicalize()) {
        (Ok(expected_canonical), Ok(actual_canonical)) => expected_canonical == actual_canonical,
        _ => false,
    }
}

pub(super) fn find_location_by_root(store: &Store, target_root: &Path) -> Result<Option<LocationDescriptor>, AppError> {
    let locations = store.location_list()?;
    Ok(locations
        .into_iter()
        .find(|location| paths_match(target_root, &location.root_path)))
}

pub(super) fn resolve_default_capture_root(app: &AppHandle) -> Result<PathBuf, AppError> {
    let path = match app.path().document_dir() {
        Ok(documents_dir) => documents_dir.join("inbox"),
        Err(documents_error) => {
            log::warn!(
                "Failed to resolve documents directory: {}. Falling back to $HOME/Documents.",
                documents_error
            );
            let home_dir = app.path().home_dir().map_err(|home_error| {
                AppError::io(format!(
                    "Failed to resolve documents directory: {} (home fallback failed: {})",
                    documents_error, home_error
                ))
            })?;
            home_dir.join("Documents").join("inbox")
        }
    };

    Ok(path)
}

pub(super) fn ensure_default_capture_location(app: &AppHandle, state: &AppState) -> Result<LocationId, AppError> {
    let capture_root = resolve_default_capture_root(app)?;
    std::fs::create_dir_all(&capture_root).map_err(|error| {
        AppError::io(format!(
            "Failed to create capture inbox directory {:?}: {}",
            capture_root, error
        ))
    })?;

    if let Some(existing) = find_location_by_root(&state.store, &capture_root)? {
        return Ok(existing.id);
    }

    let location_name = capture_root
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("inbox")
        .to_string();

    match state.store.location_add(location_name, capture_root.clone()) {
        Ok(descriptor) => {
            if let Err(error) = app.fs_scope().allow_directory(&capture_root, true) {
                log::warn!("Failed to add auto-created capture location to fs scope: {}", error);
            }

            if let Err(error) = state.store.reconcile_location_index(descriptor.id) {
                log::warn!(
                    "Initial index build failed for auto-created capture location {:?}: {}",
                    descriptor.id,
                    error
                );
            }

            Ok(descriptor.id)
        }
        Err(add_error) => {
            if let Some(existing) = find_location_by_root(&state.store, &capture_root)? {
                return Ok(existing.id);
            }
            Err(add_error)
        }
    }
}

pub(super) fn resolve_capture_target_location(
    app: &AppHandle, state: &AppState, destination: &Option<writer_store::CaptureDocRef>,
) -> Result<LocationId, AppError> {
    if let Some(destination_ref) = destination {
        let destination_id = LocationId(destination_ref.location_id);
        if state.store.location_get(destination_id)?.is_some() {
            return Ok(destination_id);
        }
        log::warn!(
            "Capture destination location no longer exists: {}. Falling back to current/open location resolution.",
            destination_ref.location_id
        );
    }

    if let Some(last_open_doc) = state.store.last_open_doc_get()? {
        let last_open_location = LocationId(last_open_doc.location_id);
        if state.store.location_get(last_open_location)?.is_some() {
            return Ok(last_open_location);
        }
        log::warn!(
            "Last open location no longer exists: {}. Falling back to default capture inbox location.",
            last_open_doc.location_id
        );
    }

    ensure_default_capture_location(app, state)
}

/// Reconciles locations on startup and emits events for any issues
pub fn reconcile(app: &AppHandle) -> Result<(), AppError> {
    log::info!("Starting location reconciliation");

    let state = app.state::<AppState>();
    let locations = state.store.location_list()?;

    let mut missing = Vec::new();
    let mut checked = 0;

    for location in locations {
        checked += 1;

        if !location.root_path.exists() {
            log::warn!(
                "Location root missing: id={}, path={:?}",
                location.id.0,
                location.root_path
            );

            missing.push(location.id);

            let event = BackendEvent::LocationMissing { location_id: location.id, path: location.root_path.clone() };

            if let Err(e) = app.emit("backend-event", event) {
                log::error!("Failed to emit location missing event: {}", e);
            }
        }
    }

    match state.store.reconcile_indexes() {
        Ok(indexed) => log::info!("Startup index reconciliation complete: indexed_files={}", indexed),
        Err(error) => log::error!("Startup index reconciliation failed: {}", error),
    }

    let completion_event = BackendEvent::ReconciliationComplete { checked, missing: missing.clone() };

    if let Err(e) = app.emit("backend-event", completion_event) {
        log::error!("Failed to emit reconciliation complete event: {}", e);
    }

    log::info!(
        "Location reconciliation complete: checked={}, missing={}",
        checked,
        missing.len()
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use notify::event::{CreateKind, ModifyKind, RemoveKind, RenameMode};

    #[test]
    fn watcher_filter_allows_create_modify_remove() {
        assert!(should_process_watcher_event(&EventKind::Create(CreateKind::Any)));
        assert!(should_process_watcher_event(&EventKind::Modify(ModifyKind::Any)));
        assert!(should_process_watcher_event(&EventKind::Remove(RemoveKind::Any)));
    }

    #[test]
    fn watcher_filter_ignores_non_mutating_events() {
        assert!(!should_process_watcher_event(&EventKind::Any));
        assert!(!should_process_watcher_event(&EventKind::Other));
    }

    #[test]
    fn maps_event_kinds_to_fs_change_kind() {
        assert_eq!(
            change_kind_from_event_kind(&EventKind::Create(CreateKind::Any)),
            FsChangeKind::Created
        );
        assert_eq!(
            change_kind_from_event_kind(&EventKind::Modify(ModifyKind::Any)),
            FsChangeKind::Modified
        );
        assert_eq!(
            change_kind_from_event_kind(&EventKind::Modify(ModifyKind::Name(RenameMode::Any))),
            FsChangeKind::Renamed
        );
        assert_eq!(
            change_kind_from_event_kind(&EventKind::Remove(RemoveKind::Any)),
            FsChangeKind::Deleted
        );
    }
}
