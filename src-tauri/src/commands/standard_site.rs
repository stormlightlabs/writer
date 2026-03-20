//! Standard.Site publication/post commands

use super::{AppState, CommandResponse};
use tauri::State;
use writer_core::{
    atproto::{PostRecord, PublicationRecord},
    CommandResult,
};

#[tauri::command]
pub async fn publication_list(
    state: State<'_, AppState>, did_or_handle: String,
) -> CommandResponse<Vec<PublicationRecord>> {
    log::info!("Listing Standard.Site publications");

    match state.atproto.publication_list(&did_or_handle).await {
        Ok(records) => Ok(CommandResult::ok(records)),
        Err(error) => {
            log::error!("Failed to list Standard.Site publications: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}

#[tauri::command]
pub async fn publication_get(
    state: State<'_, AppState>, did_or_handle: String, tid: String,
) -> CommandResponse<PublicationRecord> {
    log::info!("Fetching Standard.Site publication: {}", tid);

    match state.atproto.publication_get(&did_or_handle, &tid).await {
        Ok(record) => Ok(CommandResult::ok(record)),
        Err(error) => {
            log::error!("Failed to fetch Standard.Site publication: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}

#[tauri::command]
pub async fn post_list(
    state: State<'_, AppState>, did_or_handle: String, publication_tid: Option<String>,
) -> CommandResponse<Vec<PostRecord>> {
    log::info!("Listing Standard.Site posts");

    match state
        .atproto
        .post_list(&did_or_handle, publication_tid.as_deref())
        .await
    {
        Ok(records) => Ok(CommandResult::ok(records)),
        Err(error) => {
            log::error!("Failed to list Standard.Site posts: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}

#[tauri::command]
pub async fn post_get(state: State<'_, AppState>, did_or_handle: String, tid: String) -> CommandResponse<PostRecord> {
    log::info!("Fetching Standard.Site post: {}", tid);

    match state.atproto.post_get(&did_or_handle, &tid).await {
        Ok(record) => Ok(CommandResult::ok(record)),
        Err(error) => {
            log::error!("Failed to fetch Standard.Site post: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}

#[tauri::command]
pub async fn post_get_markdown(
    state: State<'_, AppState>, did_or_handle: String, tid: String,
) -> CommandResponse<String> {
    log::info!("Fetching Standard.Site post markdown: {}", tid);

    match state.atproto.post_get_markdown(&did_or_handle, &tid).await {
        Ok(markdown) => Ok(CommandResult::ok(markdown)),
        Err(error) => {
            log::error!("Failed to fetch Standard.Site post markdown: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}
