use super::{AppState, CommandResponse};
use crate::atproto::SessionInfo;
use tauri::State;
use writer_core::CommandResult;

#[tauri::command]
pub async fn atproto_login(state: State<'_, AppState>, handle: String) -> CommandResponse<SessionInfo> {
    log::info!("Starting AT Protocol login flow");

    match state.atproto.login(&handle).await {
        Ok(session) => Ok(CommandResult::ok(session)),
        Err(error) => {
            log::error!("AT Protocol login failed: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}

#[tauri::command]
pub async fn atproto_logout(state: State<'_, AppState>) -> CommandResponse<()> {
    log::info!("Logging out of AT Protocol");

    match state.atproto.logout().await {
        Ok(()) => Ok(CommandResult::ok(())),
        Err(error) => {
            log::error!("AT Protocol logout failed: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}

#[tauri::command]
pub async fn atproto_session_status(state: State<'_, AppState>) -> CommandResponse<Option<SessionInfo>> {
    Ok(CommandResult::ok(state.atproto.session_status().await))
}
