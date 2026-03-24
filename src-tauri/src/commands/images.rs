use super::{AppState, CommandResponse};
use std::path::PathBuf;
use tauri::State;
use writer_core::{AppError, CommandResult, ImageAsset, LocationId};

/// Imports an image file into `.writer-assets/` for the given location.
///
/// Validates format (PNG, JPEG, GIF, WebP, SVG) and size (≤ 10 MiB),
/// hashes the file with blake3, and copies it to `.writer-assets/<hash>.<ext>`.
/// If the hash already exists the call is a no-op and returns the existing path.
///
/// Returns the relative asset path, e.g. `.writer-assets/abc123.png`.
#[tauri::command]
pub fn image_import(state: State<'_, AppState>, location_id: i64, source_path: String) -> CommandResponse<String> {
    let location_id = LocationId(location_id);
    let source = PathBuf::from(&source_path);

    log::debug!("image_import: location={:?}, source={:?}", location_id, source);

    match state.store.image_import(location_id, &source) {
        Ok(rel_path) => {
            log::info!("image_import: ok → {}", rel_path);
            Ok(CommandResult::ok(rel_path))
        }
        Err(e) => {
            log::error!("image_import failed: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Deletes an image asset from `.writer-assets/` for the given location.
///
/// Returns `true` if the file was removed, `false` if it did not exist.
/// Returns an error if `asset_path` does not start with `.writer-assets/`.
#[tauri::command]
pub fn image_delete(state: State<'_, AppState>, location_id: i64, asset_path: String) -> CommandResponse<bool> {
    let location_id = LocationId(location_id);

    log::debug!("image_delete: location={:?}, asset_path={}", location_id, asset_path);

    match state.store.image_delete(location_id, &asset_path) {
        Ok(removed) => {
            log::info!("image_delete: removed={}", removed);
            Ok(CommandResult::ok(removed))
        }
        Err(e) => {
            log::error!("image_delete failed: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Resolves a local markdown asset reference to an absolute path within the location root.
#[tauri::command]
pub fn asset_resolve(
    state: State<'_, AppState>, location_id: i64, doc_rel_path: String, asset_path: String,
) -> CommandResponse<String> {
    let location_id = LocationId(location_id);
    let doc_rel_path = PathBuf::from(&doc_rel_path);

    log::debug!(
        "asset_resolve: location={:?}, doc_rel_path={:?}, asset_path={}",
        location_id,
        doc_rel_path,
        asset_path
    );

    match state.store.asset_resolve(location_id, &doc_rel_path, &asset_path) {
        Ok(resolved_path) => {
            log::debug!("asset_resolve: ok → {}", resolved_path.display());
            Ok(CommandResult::ok(resolved_path.to_string_lossy().to_string()))
        }
        Err(e) => {
            log::error!("asset_resolve failed: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Converts a location-scoped SVG asset to a PNG data URL.
///
/// Resolves the asset path relative to the source document, then delegates to
/// `writer_store::Store::svg_to_png`. Returns `data:image/png;base64,...`.
#[tauri::command]
pub fn svg_to_png(
    state: State<'_, AppState>, location_id: i64, doc_rel_path: String, asset_path: String,
) -> CommandResponse<String> {
    let location_id = LocationId(location_id);
    let doc_rel_path = PathBuf::from(&doc_rel_path);

    log::debug!(
        "svg_to_png: location={:?}, doc_rel_path={:?}, asset_path={}",
        location_id,
        doc_rel_path,
        asset_path
    );

    let resolved_path = match state.store.asset_resolve(location_id, &doc_rel_path, &asset_path) {
        Ok(path) => path,
        Err(e) => {
            log::error!("svg_to_png resolve failed: {}", e);
            return Ok(CommandResult::err(e));
        }
    };

    match state.store.svg_to_png(&resolved_path) {
        Ok(data_url) => Ok(CommandResult::ok(data_url)),
        Err(e) => {
            log::error!("svg_to_png failed: {}", e);
            Ok(CommandResult::err(e))
        }
    }
}

/// Lists all image assets in `.writer-assets/` for the given location.
///
/// Returns an empty vec if the assets directory does not exist yet.
#[tauri::command]
pub fn image_list(state: State<'_, AppState>, location_id: i64) -> CommandResponse<Vec<ImageAsset>> {
    let location_id = LocationId(location_id);

    log::debug!("image_list: location={:?}", location_id);

    match state.store.image_list(location_id) {
        Ok(assets) => {
            log::debug!("image_list: {} assets", assets.len());
            Ok(CommandResult::ok(assets))
        }
        Err(e) => {
            log::error!("image_list failed: {}", e);
            Ok(CommandResult::err(AppError::io(format!(
                "Failed to list images: {}",
                e
            ))))
        }
    }
}
