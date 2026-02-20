use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FsExt;
use writer_core::{
    AppError, BackendEvent, CommandResult, DocContent, DocId, DocListOptions, DocMeta, LocationDescriptor, LocationId,
    SaveResult, SearchFilters, SearchHit,
};
use writer_md::{MarkdownEngine, MarkdownProfile, PdfRenderResult, RenderResult};
use writer_store::{Store, UiLayoutSettings};

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

fn emit_doc_modified_event(app: &AppHandle, doc_id: DocId, mtime: chrono::DateTime<chrono::Utc>) {
    let event = BackendEvent::DocModifiedExternally { doc_id, new_mtime: mtime };
    if let Err(error) = app.emit("backend-event", event) {
        tracing::error!("Failed to emit DocModifiedExternally event: {}", error);
    }
}

fn handle_watcher_event(
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

                    if let Err(error) = state.store.reconcile_location_index(descriptor.id) {
                        tracing::warn!("Initial index build failed for location {:?}: {}", descriptor.id, error);
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

    if let Ok(mut watchers) = state.watchers.lock() {
        watchers.remove(&location_id);
    }

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

#[tauri::command]
pub fn ui_layout_get(state: State<'_, AppState>) -> Result<CommandResult<UiLayoutSettings>, ()> {
    tracing::debug!("Loading persisted UI layout settings");

    match state.store.ui_layout_get() {
        Ok(settings) => Ok(CommandResult::ok(settings)),
        Err(e) => {
            tracing::error!("Failed to load UI layout settings: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

#[tauri::command]
pub fn ui_layout_set(state: State<'_, AppState>, settings: UiLayoutSettings) -> Result<CommandResult<bool>, ()> {
    tracing::debug!("Persisting UI layout settings");

    match state.store.ui_layout_set(&settings) {
        Ok(()) => Ok(CommandResult::ok(true)),
        Err(e) => {
            tracing::error!("Failed to persist UI layout settings: {}", e);
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

                let new_mtime = result
                    .new_meta
                    .as_ref()
                    .map(|meta| meta.mtime)
                    .unwrap_or_else(chrono::Utc::now);
                emit_doc_modified_event(&app, doc_id.clone(), new_mtime);

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

/// Enables filesystem watching for a location and reindexes changed files.
#[tauri::command]
pub fn watch_enable(app: AppHandle, state: State<'_, AppState>, location_id: i64) -> Result<CommandResult<bool>, ()> {
    let location_id_wrapped = LocationId(location_id);

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
        return Ok(CommandResult::ok(false));
    }

    let root_path = location.root_path.clone();
    let store = Arc::clone(&state.store);
    let app_handle = app.clone();
    let root_for_callback = root_path.clone();

    let watcher_result = RecommendedWatcher::new(
        move |result| match result {
            Ok(event) => {
                handle_watcher_event(&app_handle, &store, location_id_wrapped, &root_for_callback, event);
            }
            Err(error) => {
                tracing::error!("Watcher error for location {}: {}", location_id, error);
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
        return Ok(CommandResult::err(AppError::new(
            writer_core::ErrorCode::Io,
            format!("Failed to watch path: {}", error),
        )));
    }

    watchers.insert(location_id, watcher);
    Ok(CommandResult::ok(true))
}

/// Disables filesystem watching for a location.
#[tauri::command]
pub fn watch_disable(state: State<'_, AppState>, location_id: i64) -> Result<CommandResult<bool>, ()> {
    let mut watchers = match state.watchers.lock() {
        Ok(guard) => guard,
        Err(_) => return Ok(CommandResult::err(AppError::io("Failed to lock watchers map"))),
    };

    Ok(CommandResult::ok(watchers.remove(&location_id).is_some()))
}

/// Full-text search across indexed documents.
#[tauri::command]
pub fn search(
    state: State<'_, AppState>, query: String, filters: Option<SearchFilters>, limit: Option<usize>,
) -> Result<CommandResult<Vec<SearchHit>>, ()> {
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
) -> Result<CommandResult<RenderResult>, ()> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    tracing::debug!(
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
            tracing::debug!(
                "Markdown rendered successfully: html_len={}, outline_items={}",
                result.html.len(),
                result.metadata.outline.len()
            );
            Ok(CommandResult::ok(result))
        }
        Err(e) => {
            tracing::error!("Failed to render markdown: {}", e);
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
) -> Result<CommandResult<PdfRenderResult>, ()> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    tracing::debug!(
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
            tracing::debug!(
                "Markdown rendered for PDF successfully: nodes={}, word_count={}",
                result.nodes.len(),
                result.word_count
            );
            Ok(CommandResult::ok(result))
        }
        Err(e) => {
            tracing::error!("Failed to render markdown for PDF: {}", e);
            Ok(CommandResult::err(AppError::new(
                writer_core::ErrorCode::Parse,
                format!("Failed to render markdown for PDF: {}", e),
            )))
        }
    }
}
