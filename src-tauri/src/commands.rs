use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FsExt;
use writer_core::{
    AppError, BackendEvent, CommandResult, DocContent, DocId, DocListOptions, DocMeta, LocationDescriptor, LocationId,
    SaveResult,
};
use writer_store::Store;

/// Application state shared across commands
pub struct AppState {
    pub store: Arc<Store>,
}

impl AppState {
    pub fn new(store: Store) -> Self {
        Self { store: Arc::new(store) }
    }
}

/// Adds a new location via the folder picker dialog
#[tauri::command]
pub async fn location_add_via_dialog(
    app: AppHandle, state: State<'_, AppState>,
) -> Result<CommandResult<LocationDescriptor>, ()> {
    tracing::debug!("Opening folder picker dialog");

    let folder_path = app.dialog().file().blocking_pick_folder();

    match folder_path {
        Some(path) => {
            let path_buf: PathBuf = path.into_path().map_err(|_| ())?;
            tracing::info!("Folder selected: {:?}", path_buf);

            let name = path_buf
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Unnamed Location")
                .to_string();

            match state.store.location_add(name.clone(), path_buf.clone()) {
                Ok(descriptor) => {
                    tracing::info!("Location added successfully: id={:?}", descriptor.id);

                    if let Err(e) = app.fs_scope().allow_directory(&path_buf, true) {
                        tracing::warn!("Failed to add directory to fs scope: {}", e);
                    }

                    Ok(CommandResult::ok(descriptor))
                }
                Err(e) => {
                    tracing::error!("Failed to add location: {}", e);
                    Ok(CommandResult::err(e))
                }
            }
        }
        None => {
            tracing::debug!("Folder picker cancelled by user");
            Ok(CommandResult::err(AppError::new(
                writer_core::ErrorCode::PermissionDenied,
                "No folder selected",
            )))
        }
    }
}

/// Lists all registered locations
#[tauri::command]
pub fn location_list(state: State<'_, AppState>) -> Result<CommandResult<Vec<LocationDescriptor>>, ()> {
    tracing::debug!("Listing all locations");

    match state.store.location_list() {
        Ok(locations) => {
            tracing::debug!("Found {} locations", locations.len());
            Ok(CommandResult::ok(locations))
        }
        Err(e) => {
            tracing::error!("Failed to list locations: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Removes a location by ID
#[tauri::command]
pub fn location_remove(state: State<'_, AppState>, location_id: i64) -> Result<CommandResult<bool>, ()> {
    let id = LocationId(location_id);
    tracing::info!("Removing location: id={}", location_id);

    match state.store.location_remove(id) {
        Ok(removed) => {
            if removed {
                tracing::info!("Location removed successfully: id={}", location_id);
            } else {
                tracing::warn!("Location not found for removal: id={}", location_id);
            }
            Ok(CommandResult::ok(removed))
        }
        Err(e) => {
            tracing::error!("Failed to remove location: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Validates all locations and returns those that no longer exist
#[tauri::command]
pub fn location_validate(state: State<'_, AppState>) -> Result<CommandResult<Vec<(i64, String)>>, ()> {
    tracing::debug!("Validating all locations");

    match state.store.validate_locations() {
        Ok(missing) => {
            let result: Vec<(i64, String)> = missing
                .into_iter()
                .map(|(id, path)| (id.0, path.to_string_lossy().to_string()))
                .collect();

            if !result.is_empty() {
                tracing::warn!("Found {} missing locations", result.len());
            } else {
                tracing::debug!("All locations are valid");
            }

            Ok(CommandResult::ok(result))
        }
        Err(e) => {
            tracing::error!("Failed to validate locations: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Reconciles locations on startup and emits events for any issues
pub fn reconcile_locations(app: &AppHandle) -> Result<(), AppError> {
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

/// Lists documents in a location
#[tauri::command]
pub fn doc_list(
    state: State<'_, AppState>, location_id: i64, options: Option<DocListOptions>,
) -> Result<CommandResult<Vec<DocMeta>>, ()> {
    let id = LocationId(location_id);
    tracing::debug!("Listing documents for location: id={}", location_id);

    match state.store.doc_list(id, options) {
        Ok(docs) => {
            tracing::debug!("Found {} documents in location {}", docs.len(), location_id);
            Ok(CommandResult::ok(docs))
        }
        Err(e) => {
            tracing::error!("Failed to list documents: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Opens a document by location_id and relative path
#[tauri::command]
pub fn doc_open(
    state: State<'_, AppState>, location_id: i64, rel_path: String,
) -> Result<CommandResult<DocContent>, ()> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    tracing::debug!("Opening document: location={:?}, path={:?}", location_id, rel_path);

    match DocId::new(location_id, rel_path) {
        Ok(doc_id) => match state.store.doc_open(&doc_id) {
            Ok(content) => {
                tracing::info!(
                    "Document opened successfully: location={:?}, size={} bytes",
                    doc_id.location_id,
                    content.meta.size_bytes
                );
                Ok(CommandResult::ok(content))
            }
            Err(e) => {
                tracing::error!("Failed to open document: {}", e);
                Ok(CommandResult::err(e))
            }
        },
        Err(e) => {
            tracing::error!("Invalid document reference: {}", e);
            Ok(CommandResult::err(AppError::invalid_path(format!(
                "Invalid path: {}",
                e
            ))))
        }
    }
}

/// Saves a document with atomic write semantics
#[tauri::command]
pub fn doc_save(
    app: AppHandle, state: State<'_, AppState>, location_id: i64, rel_path: String, text: String,
) -> Result<CommandResult<SaveResult>, ()> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    tracing::debug!(
        "Saving document: location={:?}, path={:?}, size={} bytes",
        location_id,
        rel_path,
        text.len()
    );

    match DocId::new(location_id, rel_path) {
        Ok(doc_id) => match state.store.doc_save(&doc_id, &text, None) {
            Ok(result) => {
                if result.conflict_detected {
                    tracing::warn!(
                        "Conflicted copy detected: location={:?}, path={:?}",
                        doc_id.location_id,
                        doc_id.rel_path
                    );

                    let event = BackendEvent::ConflictDetected {
                        location_id: doc_id.location_id,
                        rel_path: doc_id.rel_path.clone(),
                        conflict_filename: doc_id
                            .rel_path
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_else(|| "unknown".to_string()),
                    };

                    if let Err(e) = app.emit("backend-event", event) {
                        tracing::error!("Failed to emit conflict event: {}", e);
                    }
                }

                tracing::info!(
                    "Document saved successfully: location={:?}, size={} bytes",
                    doc_id.location_id,
                    text.len()
                );

                Ok(CommandResult::ok(result))
            }
            Err(e) => {
                tracing::error!("Failed to save document: {}", e);
                Ok(CommandResult::err(e))
            }
        },
        Err(e) => {
            tracing::error!("Invalid document reference: {}", e);
            Ok(CommandResult::err(AppError::invalid_path(format!(
                "Invalid path: {}",
                e
            ))))
        }
    }
}

/// Checks if a document exists in a location
#[tauri::command]
pub fn doc_exists(state: State<'_, AppState>, location_id: i64, rel_path: String) -> Result<CommandResult<bool>, ()> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    tracing::debug!(
        "Checking document existence: location={:?}, path={:?}",
        location_id,
        rel_path
    );

    match DocId::new(location_id, rel_path) {
        Ok(doc_id) => match state.store.location_get(doc_id.location_id) {
            Ok(Some(location)) => {
                let full_path = doc_id.resolve(&location.root_path);
                let exists = full_path.exists();
                Ok(CommandResult::ok(exists))
            }
            Ok(None) => {
                tracing::warn!("Location not found: {:?}", doc_id.location_id);
                Ok(CommandResult::err(AppError::not_found("Location not found")))
            }
            Err(e) => {
                tracing::error!("Failed to check location: {}", e);
                Ok(CommandResult::err(e))
            }
        },
        Err(e) => {
            tracing::error!("Invalid document reference: {}", e);
            Ok(CommandResult::err(AppError::invalid_path(format!(
                "Invalid path: {}",
                e
            ))))
        }
    }
}
