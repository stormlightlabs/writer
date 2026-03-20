//! Tangled.org string (snippets/gists) commands

use super::{AppState, CommandResponse};
use tauri::State;
use writer_core::{atproto::StringRecord, CommandResult};

#[tauri::command]
pub async fn string_create(
    state: State<'_, AppState>, filename: String, description: String, contents: String,
) -> CommandResponse<StringRecord> {
    log::info!("Creating Tangled string: {}", filename);

    match state.atproto.string_create(&filename, &description, &contents).await {
        Ok(record) => Ok(CommandResult::ok(record)),
        Err(error) => {
            log::error!("Failed to create Tangled string: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}

#[tauri::command]
pub async fn string_update(
    state: State<'_, AppState>, tid: String, filename: String, description: String, contents: String,
) -> CommandResponse<StringRecord> {
    log::info!("Updating Tangled string: {}", tid);

    match state
        .atproto
        .string_update(&tid, &filename, &description, &contents)
        .await
    {
        Ok(record) => Ok(CommandResult::ok(record)),
        Err(error) => {
            log::error!("Failed to update Tangled string: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}

#[tauri::command]
pub async fn string_delete(state: State<'_, AppState>, tid: String) -> CommandResponse<()> {
    log::info!("Deleting Tangled string: {}", tid);

    match state.atproto.string_delete(&tid).await {
        Ok(()) => Ok(CommandResult::ok(())),
        Err(error) => {
            log::error!("Failed to delete Tangled string: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}

#[tauri::command]
pub async fn string_list(state: State<'_, AppState>, did_or_handle: String) -> CommandResponse<Vec<StringRecord>> {
    log::info!("Listing Tangled strings");

    match state.atproto.string_list(&did_or_handle).await {
        Ok(records) => Ok(CommandResult::ok(records)),
        Err(error) => {
            log::error!("Failed to list Tangled strings: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}

#[tauri::command]
pub async fn string_get(
    state: State<'_, AppState>, did_or_handle: String, tid: String,
) -> CommandResponse<StringRecord> {
    log::info!("Fetching Tangled string");

    match state.atproto.string_get(&did_or_handle, &tid).await {
        Ok(record) => Ok(CommandResult::ok(record)),
        Err(error) => {
            log::error!("Failed to fetch Tangled string: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}
