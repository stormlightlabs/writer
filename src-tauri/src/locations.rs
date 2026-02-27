use super::AppState;
use notify::{Event, EventKind};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_fs::FsExt;
use writer_core::{AppError, BackendEvent, DocId, LocationDescriptor, LocationId};
use writer_store::Store;

pub(super) fn emit_doc_modified_event(app: &AppHandle, doc_id: DocId, mtime: chrono::DateTime<chrono::Utc>) {
    let event = BackendEvent::DocModifiedExternally { doc_id, new_mtime: mtime };
    if let Err(error) = app.emit("backend-event", event) {
        tracing::error!("Failed to emit DocModifiedExternally event: {}", error);
    }
}

pub(super) fn handle_watcher_event(
    app: &AppHandle, store: &Arc<Store>, location_id: LocationId, root_path: &PathBuf, event: Event,
) {
    let should_process = matches!(
        event.kind,
        EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
    );

    if !should_process {
        return;
    }

    for path in event.paths {
        let rel_path = match path.strip_prefix(root_path) {
            Ok(rel_path) if !rel_path.as_os_str().is_empty() => rel_path.to_path_buf(),
            _ => continue,
        };

        let doc_id = match DocId::new(location_id, rel_path) {
            Ok(doc_id) => doc_id,
            Err(error) => {
                tracing::warn!("Ignoring watcher path that failed validation: {}", error);
                continue;
            }
        };

        if path.exists() && path.is_file() {
            match store.reindex_document(&doc_id) {
                Ok(()) => {
                    let new_mtime = std::fs::metadata(&path)
                        .and_then(|metadata| metadata.modified())
                        .map(chrono::DateTime::<chrono::Utc>::from)
                        .unwrap_or_else(|_| chrono::Utc::now());
                    emit_doc_modified_event(app, doc_id, new_mtime);
                }
                Err(error) => {
                    tracing::error!("Failed to reindex changed file {:?}: {}", path, error);
                }
            }
        } else if !path.exists() {
            match store.remove_document_from_index(&doc_id) {
                Ok(()) => {
                    emit_doc_modified_event(app, doc_id, chrono::Utc::now());
                }
                Err(error) => {
                    tracing::error!("Failed to remove deleted file {:?} from index: {}", path, error);
                }
            }
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
            tracing::warn!(
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
                tracing::warn!("Failed to add auto-created capture location to fs scope: {}", error);
            }

            if let Err(error) = state.store.reconcile_location_index(descriptor.id) {
                tracing::warn!(
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
        tracing::warn!(
            "Capture destination location no longer exists: {}. Falling back to current/open location resolution.",
            destination_ref.location_id
        );
    }

    if let Some(last_open_doc) = state.store.last_open_doc_get()? {
        let last_open_location = LocationId(last_open_doc.location_id);
        if state.store.location_get(last_open_location)?.is_some() {
            return Ok(last_open_location);
        }
        tracing::warn!(
            "Last open location no longer exists: {}. Falling back to default capture inbox location.",
            last_open_doc.location_id
        );
    }

    ensure_default_capture_location(app, state)
}

/// Reconciles locations on startup and emits events for any issues
pub fn reconcile(app: &AppHandle) -> Result<(), AppError> {
    tracing::info!("Starting location reconciliation");

    let state = app.state::<AppState>();
    let locations = state.store.location_list()?;

    let mut missing = Vec::new();
    let mut checked = 0;

    for location in locations {
        checked += 1;

        if !location.root_path.exists() {
            tracing::warn!(
                "Location root missing: id={}, path={:?}",
                location.id.0,
                location.root_path
            );

            missing.push(location.id);

            let event = BackendEvent::LocationMissing { location_id: location.id, path: location.root_path.clone() };

            if let Err(e) = app.emit("backend-event", event) {
                tracing::error!("Failed to emit location missing event: {}", e);
            }
        }
    }

    match state.store.reconcile_indexes() {
        Ok(indexed) => tracing::info!("Startup index reconciliation complete: indexed_files={}", indexed),
        Err(error) => tracing::error!("Startup index reconciliation failed: {}", error),
    }

    let completion_event = BackendEvent::ReconciliationComplete { checked, missing: missing.clone() };

    if let Err(e) = app.emit("backend-event", completion_event) {
        tracing::error!("Failed to emit reconciliation complete event: {}", e);
    }

    tracing::info!(
        "Location reconciliation complete: checked={}, missing={}",
        checked,
        missing.len()
    );

    Ok(())
}
