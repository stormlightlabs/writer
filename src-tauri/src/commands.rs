use super::capture;
use super::locations::*;
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FsExt;
use writer_core::{
    scan_style_matches, AppError, BackendEvent, CommandResult, DocContent, DocId, DocListOptions, DocMeta,
    LocationDescriptor, LocationId, SaveResult, SearchFilters, SearchHit, StyleCategorySettings, StyleMatch,
    StylePatternInput, StyleScanInput,
};
use writer_md::{MarkdownEngine, MarkdownProfile, PdfRenderResult, RenderResult, TextExportResult};
use writer_store::{Store, StyleCheckSettings, UiLayoutSettings};

type CommandResponse<T> = std::result::Result<CommandResult<T>, AppError>;

/// Application state shared across commands
pub struct AppState {
    pub store: Arc<Store>,
    pub watchers: Mutex<HashMap<i64, RecommendedWatcher>>,
}

impl AppState {
    pub fn new(store: Store) -> Self {
        Self { store: Arc::new(store), watchers: Mutex::new(HashMap::new()) }
    }
}

#[tauri::command]
pub fn app_version_get() -> CommandResponse<String> {
    Ok(CommandResult::ok(
        option_env!("WRITER_APP_VERSION")
            .unwrap_or(concat!("v", env!("CARGO_PKG_VERSION")))
            .to_string(),
    ))
}

/// Adds a new location via the folder picker dialog
#[tauri::command]
pub async fn location_add_via_dialog(
    app: AppHandle, state: State<'_, AppState>,
) -> CommandResponse<LocationDescriptor> {
    log::debug!("Opening folder picker dialog");

    let folder_path = app.dialog().file().blocking_pick_folder();

    match folder_path {
        Some(path) => {
            let path_buf: PathBuf = path
                .into_path()
                .map_err(|_| AppError::invalid_path("Selected folder path is invalid"))?;
            log::info!("Folder selected: {:?}", path_buf);

            let name = path_buf
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Unnamed Location")
                .to_string();

            match state.store.location_add(name.clone(), path_buf.clone()) {
                Ok(descriptor) => {
                    log::info!("Location added successfully: id={:?}", descriptor.id);

                    if let Err(e) = app.fs_scope().allow_directory(&path_buf, true) {
                        log::warn!("Failed to add directory to fs scope: {}", e);
                    }

                    if let Err(error) = state.store.reconcile_location_index(descriptor.id) {
                        log::warn!("Initial index build failed for location {:?}: {}", descriptor.id, error);
                    }

                    Ok(CommandResult::ok(descriptor))
                }
                Err(e) => {
                    log::error!("Failed to add location: {}", e);
                    Ok(CommandResult::err(e))
                }
            }
        }
        None => {
            log::debug!("Folder picker cancelled by user");
            Ok(CommandResult::err(AppError::new(
                writer_core::ErrorCode::PermissionDenied,
                "No folder selected",
            )))
        }
    }
}

/// Lists all registered locations
#[tauri::command]
pub fn location_list(state: State<'_, AppState>) -> CommandResponse<Vec<LocationDescriptor>> {
    log::debug!("Listing all locations");

    match state.store.location_list() {
        Ok(locations) => {
            log::debug!("Found {} locations", locations.len());
            Ok(CommandResult::ok(locations))
        }
        Err(e) => {
            log::error!("Failed to list locations: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Removes a location by ID
#[tauri::command]
pub fn location_remove(state: State<'_, AppState>, location_id: i64) -> CommandResponse<bool> {
    let id = LocationId(location_id);
    log::info!("Removing location: id={}", location_id);

    if let Ok(mut watchers) = state.watchers.lock() {
        watchers.remove(&location_id);
    }

    match state.store.location_remove(id) {
        Ok(removed) => {
            if removed {
                log::info!("Location removed successfully: id={}", location_id);
            } else {
                log::warn!("Location not found for removal: id={}", location_id);
            }
            Ok(CommandResult::ok(removed))
        }
        Err(e) => {
            log::error!("Failed to remove location: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Validates all locations and returns those that no longer exist
#[tauri::command]
pub fn location_validate(state: State<'_, AppState>) -> CommandResponse<Vec<(i64, String)>> {
    log::debug!("Validating all locations");

    match state.store.validate_locations() {
        Ok(missing) => {
            let result: Vec<(i64, String)> = missing
                .into_iter()
                .map(|(id, path)| (id.0, path.to_string_lossy().to_string()))
                .collect();

            if !result.is_empty() {
                log::warn!("Found {} missing locations", result.len());
            } else {
                log::debug!("All locations are valid");
            }

            Ok(CommandResult::ok(result))
        }
        Err(e) => {
            log::error!("Failed to validate locations: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn ui_layout_get(state: State<'_, AppState>) -> CommandResponse<UiLayoutSettings> {
    log::debug!("Loading persisted UI layout settings");

    match state.store.ui_layout_get() {
        Ok(settings) => Ok(CommandResult::ok(settings)),
        Err(e) => {
            log::error!("Failed to load UI layout settings: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn ui_layout_set(state: State<'_, AppState>, settings: UiLayoutSettings) -> CommandResponse<bool> {
    log::debug!("Persisting UI layout settings");

    match state.store.ui_layout_set(&settings) {
        Ok(()) => Ok(CommandResult::ok(true)),
        Err(e) => {
            log::error!("Failed to persist UI layout settings: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn session_last_doc_get(state: State<'_, AppState>) -> CommandResponse<Option<writer_store::CaptureDocRef>> {
    log::debug!("Loading last opened document session state");

    match state.store.last_open_doc_get() {
        Ok(doc_ref) => Ok(CommandResult::ok(doc_ref)),
        Err(e) => {
            log::error!("Failed to load last opened document session state: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn session_last_doc_set(
    state: State<'_, AppState>, doc_ref: Option<writer_store::CaptureDocRef>,
) -> CommandResponse<bool> {
    log::debug!("Persisting last opened document session state");

    match state.store.last_open_doc_set(doc_ref.as_ref()) {
        Ok(()) => Ok(CommandResult::ok(true)),
        Err(e) => {
            log::error!("Failed to persist last opened document session state: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn session_get(state: State<'_, AppState>) -> CommandResponse<writer_store::SessionState> {
    log::debug!("Loading persisted session state");

    match state.store.session_get() {
        Ok(session) => Ok(CommandResult::ok(session)),
        Err(e) => {
            log::error!("Failed to load session state: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn session_open_tab(
    state: State<'_, AppState>, doc_ref: writer_store::CaptureDocRef, title: String,
) -> CommandResponse<writer_store::SessionState> {
    log::debug!(
        "Opening session tab: location_id={}, rel_path={}",
        doc_ref.location_id,
        doc_ref.rel_path
    );

    match state.store.session_open_tab(doc_ref, title) {
        Ok(session) => Ok(CommandResult::ok(session)),
        Err(e) => {
            log::error!("Failed to open session tab: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn session_select_tab(state: State<'_, AppState>, tab_id: String) -> CommandResponse<writer_store::SessionState> {
    log::debug!("Selecting session tab: {}", tab_id);

    match state.store.session_select_tab(&tab_id) {
        Ok(session) => Ok(CommandResult::ok(session)),
        Err(e) => {
            log::error!("Failed to select session tab: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn session_close_tab(state: State<'_, AppState>, tab_id: String) -> CommandResponse<writer_store::SessionState> {
    log::debug!("Closing session tab: {}", tab_id);

    match state.store.session_close_tab(&tab_id) {
        Ok(session) => Ok(CommandResult::ok(session)),
        Err(e) => {
            log::error!("Failed to close session tab: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn session_reorder_tabs(
    state: State<'_, AppState>, tab_ids: Vec<String>,
) -> CommandResponse<writer_store::SessionState> {
    log::debug!("Reordering session tabs: count={}", tab_ids.len());

    match state.store.session_reorder_tabs(&tab_ids) {
        Ok(session) => Ok(CommandResult::ok(session)),
        Err(e) => {
            log::error!("Failed to reorder session tabs: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn session_mark_tab_modified(
    state: State<'_, AppState>, tab_id: String, is_modified: bool,
) -> CommandResponse<writer_store::SessionState> {
    log::debug!(
        "Marking session tab modified: tab_id={}, is_modified={}",
        tab_id,
        is_modified
    );

    match state.store.session_mark_tab_modified(&tab_id, is_modified) {
        Ok(session) => Ok(CommandResult::ok(session)),
        Err(e) => {
            log::error!("Failed to mark session tab modified: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn session_update_tab_doc(
    state: State<'_, AppState>, location_id: i64, old_rel_path: String, new_doc_ref: writer_store::CaptureDocRef,
    title: String,
) -> CommandResponse<writer_store::SessionState> {
    log::debug!(
        "Updating session tab document: location_id={}, old_rel_path={}, new_rel_path={}",
        location_id,
        old_rel_path,
        new_doc_ref.rel_path
    );

    match state
        .store
        .session_update_tab_doc(location_id, &old_rel_path, new_doc_ref, title)
    {
        Ok(session) => Ok(CommandResult::ok(session)),
        Err(e) => {
            log::error!("Failed to update session tab document: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn session_drop_doc(
    state: State<'_, AppState>, location_id: i64, rel_path: String,
) -> CommandResponse<writer_store::SessionState> {
    log::debug!(
        "Dropping document from session tabs: location_id={}, rel_path={}",
        location_id,
        rel_path
    );

    match state.store.session_drop_doc(location_id, &rel_path) {
        Ok(session) => Ok(CommandResult::ok(session)),
        Err(e) => {
            log::error!("Failed to drop document from session tabs: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn session_prune_locations(
    state: State<'_, AppState>, valid_location_ids: Vec<i64>,
) -> CommandResponse<writer_store::SessionState> {
    log::debug!("Pruning session tabs by locations: count={}", valid_location_ids.len());

    let valid_ids: HashSet<i64> = valid_location_ids.into_iter().collect();
    match state.store.session_prune_locations(&valid_ids) {
        Ok(session) => Ok(CommandResult::ok(session)),
        Err(e) => {
            log::error!("Failed to prune session tabs by locations: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Lists documents in a location
#[tauri::command]
pub fn doc_list(
    state: State<'_, AppState>, location_id: i64, options: Option<DocListOptions>,
) -> CommandResponse<Vec<DocMeta>> {
    let id = LocationId(location_id);
    let list_options = Some(options.unwrap_or(DocListOptions { recursive: true, ..Default::default() }));
    log::debug!("Listing documents for location: id={}", location_id);

    match state.store.doc_list(id, list_options) {
        Ok(docs) => {
            log::debug!("Found {} documents in location {}", docs.len(), location_id);
            Ok(CommandResult::ok(docs))
        }
        Err(e) => {
            log::error!("Failed to list documents: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Opens a document by location_id and relative path
#[tauri::command]
pub fn doc_open(state: State<'_, AppState>, location_id: i64, rel_path: String) -> CommandResponse<DocContent> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!("Opening document: location={:?}, path={:?}", location_id, rel_path);

    match DocId::new(location_id, rel_path) {
        Ok(doc_id) => match state.store.doc_open(&doc_id) {
            Ok(content) => {
                log::info!(
                    "Document opened successfully: location={:?}, size={} bytes",
                    doc_id.location_id,
                    content.meta.size_bytes
                );
                Ok(CommandResult::ok(content))
            }
            Err(e) => {
                log::error!("Failed to open document: {}", e);
                Ok(CommandResult::err(e))
            }
        },
        Err(e) => {
            log::error!("Invalid document reference: {}", e);
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
) -> CommandResponse<SaveResult> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!(
        "Saving document: location={:?}, path={:?}, size={} bytes",
        location_id,
        rel_path,
        text.len()
    );

    match DocId::new(location_id, rel_path) {
        Ok(doc_id) => match state.store.doc_save(&doc_id, &text, None) {
            Ok(result) => {
                if result.conflict_detected {
                    log::warn!(
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
                        log::error!("Failed to emit conflict event: {}", e);
                    }
                }

                log::info!(
                    "Document saved successfully: location={:?}, size={} bytes",
                    doc_id.location_id,
                    text.len()
                );

                let new_mtime = result
                    .new_meta
                    .as_ref()
                    .map(|meta| meta.mtime)
                    .unwrap_or_else(chrono::Utc::now);
                emit_doc_modified_event(&app, doc_id.clone(), new_mtime);

                Ok(CommandResult::ok(result))
            }
            Err(e) => {
                log::error!("Failed to save document: {}", e);
                Ok(CommandResult::err(e))
            }
        },
        Err(e) => {
            log::error!("Invalid document reference: {}", e);
            Ok(CommandResult::err(AppError::invalid_path(format!(
                "Invalid path: {}",
                e
            ))))
        }
    }
}

/// Checks if a document exists in a location
#[tauri::command]
pub fn doc_exists(state: State<'_, AppState>, location_id: i64, rel_path: String) -> CommandResponse<bool> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!(
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
                log::warn!("Location not found: {:?}", doc_id.location_id);
                Ok(CommandResult::err(AppError::not_found("Location not found")))
            }
            Err(e) => {
                log::error!("Failed to check location: {}", e);
                Ok(CommandResult::err(e))
            }
        },
        Err(e) => {
            log::error!("Invalid document reference: {}", e);
            Ok(CommandResult::err(AppError::invalid_path(format!(
                "Invalid path: {}",
                e
            ))))
        }
    }
}

/// Renames a document to a new filename within the same directory
#[tauri::command]
pub fn doc_rename(
    state: State<'_, AppState>, location_id: i64, rel_path: String, new_name: String,
) -> CommandResponse<DocMeta> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!(
        "Renaming document: location={:?}, path={:?}, new_name={}",
        location_id,
        rel_path,
        new_name
    );

    match DocId::new(location_id, rel_path) {
        Ok(doc_id) => match state.store.doc_rename(&doc_id, &new_name) {
            Ok(new_meta) => {
                log::info!("Document renamed successfully: {:?}", doc_id.rel_path);
                Ok(CommandResult::ok(new_meta))
            }
            Err(e) => {
                log::error!("Failed to rename document: {}", e);
                Ok(CommandResult::err(e))
            }
        },
        Err(e) => {
            log::error!("Invalid document reference: {}", e);
            Ok(CommandResult::err(AppError::invalid_path(format!(
                "Invalid path: {}",
                e
            ))))
        }
    }
}

/// Moves a document to a new relative path within the same location
#[tauri::command]
pub fn doc_move(
    state: State<'_, AppState>, location_id: i64, rel_path: String, new_rel_path: String,
) -> CommandResponse<DocMeta> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);
    let new_rel_path = PathBuf::from(&new_rel_path);

    log::debug!(
        "Moving document: location={:?}, path={:?}, new_path={:?}",
        location_id,
        rel_path,
        new_rel_path
    );

    match DocId::new(location_id, rel_path) {
        Ok(doc_id) => match state.store.doc_move(&doc_id, &new_rel_path) {
            Ok(new_meta) => {
                log::info!("Document moved successfully: {:?}", doc_id.rel_path);
                Ok(CommandResult::ok(new_meta))
            }
            Err(e) => {
                log::error!("Failed to move document: {}", e);
                Ok(CommandResult::err(e))
            }
        },
        Err(e) => {
            log::error!("Invalid document reference: {}", e);
            Ok(CommandResult::err(AppError::invalid_path(format!(
                "Invalid path: {}",
                e
            ))))
        }
    }
}

/// Deletes a document from disk and removes it from the index
#[tauri::command]
pub fn doc_delete(state: State<'_, AppState>, location_id: i64, rel_path: String) -> CommandResponse<bool> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!("Deleting document: location={:?}, path={:?}", location_id, rel_path);

    match DocId::new(location_id, rel_path) {
        Ok(doc_id) => match state.store.doc_delete(&doc_id) {
            Ok(deleted) => {
                if deleted {
                    log::info!("Document deleted successfully: {:?}", doc_id.rel_path);
                } else {
                    log::warn!("Document not found for deletion: {:?}", doc_id.rel_path);
                }
                Ok(CommandResult::ok(deleted))
            }
            Err(e) => {
                log::error!("Failed to delete document: {}", e);
                Ok(CommandResult::err(e))
            }
        },
        Err(e) => {
            log::error!("Invalid document reference: {}", e);
            Ok(CommandResult::err(AppError::invalid_path(format!(
                "Invalid path: {}",
                e
            ))))
        }
    }
}

/// Creates a directory at a relative path within a location
#[tauri::command]
pub fn dir_create(state: State<'_, AppState>, location_id: i64, rel_path: String) -> CommandResponse<bool> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!("Creating directory: location={:?}, path={:?}", location_id, rel_path);

    match state.store.dir_create(location_id, &rel_path) {
        Ok(created) => Ok(CommandResult::ok(created)),
        Err(e) => {
            log::error!("Failed to create directory: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Renames a directory to a new name within the same parent directory
#[tauri::command]
pub fn dir_rename(
    state: State<'_, AppState>, location_id: i64, rel_path: String, new_name: String,
) -> CommandResponse<String> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!(
        "Renaming directory: location={:?}, path={:?}, new_name={}",
        location_id,
        rel_path,
        new_name
    );

    match state.store.dir_rename(location_id, &rel_path, &new_name) {
        Ok(next_path) => Ok(CommandResult::ok(next_path.to_string_lossy().to_string())),
        Err(e) => {
            log::error!("Failed to rename directory: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Moves a directory to a new relative path within the same location
#[tauri::command]
pub fn dir_move(
    state: State<'_, AppState>, location_id: i64, rel_path: String, new_rel_path: String,
) -> CommandResponse<String> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);
    let new_rel_path = PathBuf::from(&new_rel_path);

    log::debug!(
        "Moving directory: location={:?}, path={:?}, new_path={:?}",
        location_id,
        rel_path,
        new_rel_path
    );

    match state.store.dir_move(location_id, &rel_path, &new_rel_path) {
        Ok(next_path) => Ok(CommandResult::ok(next_path.to_string_lossy().to_string())),
        Err(e) => {
            log::error!("Failed to move directory: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Deletes a directory and all indexed documents beneath it
#[tauri::command]
pub fn dir_delete(state: State<'_, AppState>, location_id: i64, rel_path: String) -> CommandResponse<bool> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!("Deleting directory: location={:?}, path={:?}", location_id, rel_path);

    match state.store.dir_delete(location_id, &rel_path) {
        Ok(deleted) => Ok(CommandResult::ok(deleted)),
        Err(e) => {
            log::error!("Failed to delete directory: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Enables filesystem watching for a location and reindexes changed files.
#[tauri::command]
pub fn watch_enable(app: AppHandle, state: State<'_, AppState>, location_id: i64) -> CommandResponse<bool> {
    let location_id_wrapped = LocationId(location_id);
    log::debug!("Enabling watcher for location_id={}", location_id);

    let location = match state.store.location_get(location_id_wrapped) {
        Ok(Some(location)) => location,
        Ok(None) => return Ok(CommandResult::err(AppError::not_found("Location not found"))),
        Err(error) => return Ok(CommandResult::err(error)),
    };

    let mut watchers = match state.watchers.lock() {
        Ok(guard) => guard,
        Err(_) => return Ok(CommandResult::err(AppError::io("Failed to lock watchers map"))),
    };

    if watchers.contains_key(&location_id) {
        log::debug!("Watcher already active for location_id={}", location_id);
        return Ok(CommandResult::ok(false));
    }

    let root_path = location.root_path.clone();
    log::debug!(
        "Creating watcher for location_id={}, root_path={:?}",
        location_id,
        root_path
    );
    let store = Arc::clone(&state.store);
    let app_handle = app.clone();
    let root_for_callback = root_path.canonicalize().unwrap_or_else(|_| root_path.clone());

    let watcher_result = RecommendedWatcher::new(
        move |result| match result {
            Ok(event) => {
                handle_watcher_event(&app_handle, &store, location_id_wrapped, &root_for_callback, event);
            }
            Err(error) => {
                log::error!("Watcher error for location {}: {}", location_id, error);
            }
        },
        Config::default(),
    );

    let mut watcher = match watcher_result {
        Ok(watcher) => watcher,
        Err(error) => {
            return Ok(CommandResult::err(AppError::new(
                writer_core::ErrorCode::Io,
                format!("Failed to create watcher: {}", error),
            )));
        }
    };

    if let Err(error) = watcher.watch(&root_path, RecursiveMode::Recursive) {
        log::error!(
            "Failed to watch location_id={} path {:?}: {}",
            location_id,
            root_path,
            error
        );
        return Ok(CommandResult::err(AppError::new(
            writer_core::ErrorCode::Io,
            format!("Failed to watch path: {}", error),
        )));
    }

    watchers.insert(location_id, watcher);
    log::info!(
        "Watcher enabled for location_id={}, root_path={:?}",
        location_id,
        root_path
    );
    Ok(CommandResult::ok(true))
}

/// Disables filesystem watching for a location.
#[tauri::command]
pub fn watch_disable(state: State<'_, AppState>, location_id: i64) -> CommandResponse<bool> {
    log::debug!("Disabling watcher for location_id={}", location_id);
    let mut watchers = match state.watchers.lock() {
        Ok(guard) => guard,
        Err(_) => return Ok(CommandResult::err(AppError::io("Failed to lock watchers map"))),
    };
    let removed = watchers.remove(&location_id).is_some();
    log::info!(
        "Watcher disable result for location_id={}: removed={}",
        location_id,
        removed
    );
    Ok(CommandResult::ok(removed))
}

/// Full-text search across indexed documents.
#[tauri::command]
pub fn search(
    state: State<'_, AppState>, query: String, filters: Option<SearchFilters>, limit: Option<usize>,
) -> CommandResponse<Vec<SearchHit>> {
    let limit = limit.unwrap_or(50);

    match state.store.search(&query, filters, limit) {
        Ok(results) => Ok(CommandResult::ok(results)),
        Err(error) => Ok(CommandResult::err(error)),
    }
}

/// Renders markdown text to HTML with metadata extraction
///
/// This command takes document reference, text content, and a rendering profile,
/// returning HTML with source position attributes for editor-preview sync.
#[tauri::command]
pub fn markdown_render(
    _: State<'_, AppState>, location_id: i64, rel_path: String, text: String, profile: Option<MarkdownProfile>,
) -> CommandResponse<RenderResult> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!(
        "Rendering markdown: location={:?}, path={:?}, profile={:?}, text_len={}",
        location_id,
        rel_path,
        profile,
        text.len()
    );

    let engine = MarkdownEngine::new();
    let profile = profile.unwrap_or_default();

    match engine.render(&text, profile) {
        Ok(result) => {
            log::debug!(
                "Markdown rendered successfully: html_len={}, outline_items={}",
                result.html.len(),
                result.metadata.outline.len()
            );
            Ok(CommandResult::ok(result))
        }
        Err(e) => {
            log::error!("Failed to render markdown: {}", e);
            Ok(CommandResult::err(AppError::new(
                writer_core::ErrorCode::Parse,
                format!("Failed to render markdown: {}", e),
            )))
        }
    }
}

/// Renders markdown text to a PDF-compatible AST
///
/// This command takes document text and returns a structured AST
/// suitable for rendering to PDF on the frontend with @react-pdf/renderer.
#[tauri::command]
pub fn markdown_render_for_pdf(
    _: State<'_, AppState>, location_id: i64, rel_path: String, text: String, profile: Option<MarkdownProfile>,
) -> CommandResponse<PdfRenderResult> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!(
        "Rendering markdown for PDF: location={:?}, path={:?}, profile={:?}, text_len={}",
        location_id,
        rel_path,
        profile,
        text.len()
    );

    let engine = MarkdownEngine::new();
    let profile = profile.unwrap_or(MarkdownProfile::Extended);

    match engine.render_for_pdf(&text, profile) {
        Ok(result) => {
            log::debug!(
                "Markdown rendered for PDF successfully: nodes={}, word_count={}",
                result.nodes.len(),
                result.word_count
            );
            Ok(CommandResult::ok(result))
        }
        Err(e) => {
            log::error!("Failed to render markdown for PDF: {}", e);
            Ok(CommandResult::err(AppError::new(
                writer_core::ErrorCode::Parse,
                format!("Failed to render markdown for PDF: {}", e),
            )))
        }
    }
}

/// Renders markdown text to plaintext format
///
/// This command takes document text and returns plain text with
/// Markdown formatting stripped but logical structure preserved.
#[tauri::command]
pub fn markdown_render_for_text(
    _: State<'_, AppState>, location_id: i64, rel_path: String, text: String, profile: Option<MarkdownProfile>,
) -> CommandResponse<TextExportResult> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!(
        "Rendering markdown for text export: location={:?}, path={:?}, profile={:?}, text_len={}",
        location_id,
        rel_path,
        profile,
        text.len()
    );

    let engine = MarkdownEngine::new();
    let profile = profile.unwrap_or(MarkdownProfile::Extended);

    match engine.render_for_text(&text, profile) {
        Ok(result) => {
            log::debug!(
                "Markdown rendered for text export successfully: text_len={}, word_count={}",
                result.text.len(),
                result.word_count
            );
            Ok(CommandResult::ok(result))
        }
        Err(e) => {
            log::error!("Failed to render markdown for text export: {}", e);
            Ok(CommandResult::err(AppError::new(
                writer_core::ErrorCode::Parse,
                format!("Failed to render markdown for text export: {}", e),
            )))
        }
    }
}

#[tauri::command]
pub fn style_check_get(state: State<'_, AppState>) -> CommandResponse<StyleCheckSettings> {
    log::debug!("Loading persisted style check settings");

    match state.store.style_check_get() {
        Ok(settings) => Ok(CommandResult::ok(settings)),
        Err(e) => {
            log::error!("Failed to load style check settings: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn style_check_set(state: State<'_, AppState>, settings: StyleCheckSettings) -> CommandResponse<bool> {
    log::debug!("Persisting style check settings");

    match state.store.style_check_set(&settings) {
        Ok(()) => Ok(CommandResult::ok(true)),
        Err(e) => {
            log::error!("Failed to persist style check settings: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn style_check_scan(
    _: State<'_, AppState>, text: String, settings: StyleCheckSettings,
) -> CommandResponse<Vec<StyleMatch>> {
    log::debug!("Scanning style matches: text_len={}", text.len());

    let input = StyleScanInput {
        text,
        categories: StyleCategorySettings {
            filler: settings.categories.filler,
            redundancy: settings.categories.redundancy,
            cliche: settings.categories.cliche,
        },
        custom_patterns: settings
            .custom_patterns
            .into_iter()
            .map(|pattern| StylePatternInput {
                text: pattern.text,
                category: pattern.category,
                replacement: pattern.replacement,
            })
            .collect(),
    };

    Ok(CommandResult::ok(scan_style_matches(&input)))
}

/// Gets global capture settings
#[tauri::command]
pub fn global_capture_get(state: State<'_, AppState>) -> CommandResponse<writer_store::GlobalCaptureSettings> {
    log::debug!("Loading global capture settings");

    match state.store.global_capture_get() {
        Ok(settings) => Ok(CommandResult::ok(settings)),
        Err(e) => {
            log::error!("Failed to load global capture settings: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Sets global capture settings and reconciles runtime state
#[tauri::command]
pub fn global_capture_set(
    app: AppHandle, state: State<'_, AppState>, settings: writer_store::GlobalCaptureSettings,
) -> CommandResponse<bool> {
    log::debug!("Persisting global capture settings");

    if let Err(e) = capture::validate_shortcut_format(&settings.shortcut) {
        return Ok(CommandResult::err(e));
    }

    match state.store.global_capture_set(&settings) {
        Ok(()) => match capture::reconcile_capture_runtime(&app, &settings) {
            Ok(_) => Ok(CommandResult::ok(true)),
            Err(e) => {
                log::error!("Failed to reconcile capture runtime: {}", e);
                Ok(CommandResult::err(e))
            }
        },
        Err(e) => {
            log::error!("Failed to persist global capture settings: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Opens the quick capture window
#[tauri::command]
pub fn global_capture_open(app: AppHandle) -> CommandResponse<bool> {
    log::debug!("Opening quick capture window");

    match capture::show_quick_capture_window(&app) {
        Ok(()) => Ok(CommandResult::ok(true)),
        Err(e) => {
            log::error!("Failed to open quick capture window: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Submits a capture
#[tauri::command]
pub async fn global_capture_submit(
    app: AppHandle, state: State<'_, AppState>, mode: writer_store::CaptureMode, text: String,
    destination: Option<writer_store::CaptureDocRef>, open_main_after_save: Option<bool>,
) -> CommandResponse<capture::CaptureSubmitResult> {
    log::debug!("Submitting capture: mode={:?}, text_len={}", mode, text.len());

    let settings = match state.store.global_capture_get() {
        Ok(s) => s,
        Err(e) => return Ok(CommandResult::err(e)),
    };

    let target_location = match resolve_capture_target_location(&app, &state, &destination) {
        Ok(location_id) => Some(location_id.0),
        Err(e) => return Ok(CommandResult::err(e)),
    };

    let append_target = if let Some(ref dest) = destination {
        Some(writer_store::CaptureDocRef { location_id: dest.location_id, rel_path: dest.rel_path.clone() })
    } else {
        settings.append_target.clone()
    };

    match crate::capture::handle_capture_submit(
        &app,
        mode,
        text,
        target_location,
        &settings.inbox_relative_dir,
        &append_target,
        settings.close_after_save,
    )
    .await
    {
        Ok(result) => {
            if let Err(e) = capture::update_last_capture_target(&app, result.last_capture_target.clone()) {
                log::warn!("Failed to update last capture target: {}", e);
            }

            if open_main_after_save.unwrap_or(false) && result.success {
                if let Err(e) = capture::show_main_window(&app) {
                    log::warn!("Failed to show main window: {}", e);
                }
            }

            Ok(CommandResult::ok(result))
        }
        Err(e) => Ok(CommandResult::err(e)),
    }
}

/// Pauses or resumes the global shortcut
#[tauri::command]
pub fn global_capture_pause(app: AppHandle, state: State<'_, AppState>, paused: bool) -> CommandResponse<bool> {
    log::debug!("Setting global capture pause state: {}", paused);

    let mut settings = match state.store.global_capture_get() {
        Ok(s) => s,
        Err(e) => return Ok(CommandResult::err(e)),
    };

    settings.paused = paused;

    match state.store.global_capture_set(&settings) {
        Ok(()) => match capture::reconcile_capture_runtime(&app, &settings) {
            Ok(_) => Ok(CommandResult::ok(true)),
            Err(e) => {
                log::error!("Failed to reconcile capture runtime: {}", e);
                Ok(CommandResult::err(e))
            }
        },
        Err(e) => {
            log::error!("Failed to persist global capture settings: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Validates a shortcut format
#[tauri::command]
pub fn global_capture_validate_shortcut(shortcut: String) -> CommandResponse<bool> {
    log::debug!("Validating shortcut: {}", shortcut);

    match capture::validate_shortcut_format(&shortcut) {
        Ok(()) => Ok(CommandResult::ok(true)),
        Err(e) => Ok(CommandResult::err(e)),
    }
}

/// Returns the markdown help guide content
#[tauri::command]
pub fn markdown_help_get() -> CommandResponse<String> {
    log::debug!("Fetching markdown help content");
    Ok(CommandResult::ok(writer_store::get_markdown_help().to_string()))
}
