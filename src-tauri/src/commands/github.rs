//! GitHub gist read commands

use super::{AppState, CommandResponse};
use commonplace_core::{github::GistRecord, CommandResult};
use tauri::State;

#[tauri::command]
pub async fn gist_list_public(state: State<'_, AppState>, username: String) -> CommandResponse<Vec<GistRecord>> {
    log::info!("Listing public GitHub gists");

    match state.github.gist_list_public(&username).await {
        Ok(records) => Ok(CommandResult::ok(records)),
        Err(error) => {
            log::error!("Failed to list public GitHub gists: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}

#[tauri::command]
pub async fn gist_get(state: State<'_, AppState>, gist_id: String) -> CommandResponse<GistRecord> {
    log::info!("Fetching GitHub gist");

    match state.github.gist_get(&gist_id).await {
        Ok(record) => Ok(CommandResult::ok(record)),
        Err(error) => {
            log::error!("Failed to fetch GitHub gist: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}
