use super::{AppState, CommandResponse};
use crate::atproto::StringRecord;
use tauri::State;
use writer_core::CommandResult;

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
