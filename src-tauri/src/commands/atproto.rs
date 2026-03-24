use super::{AppState, CommandResponse};
use tauri::State;
use writer_core::atproto::SessionInfo;
use writer_core::{AppError, CommandResult, ErrorCode, LocationId};

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

#[tauri::command]
pub async fn blob_download(
    state: State<'_, AppState>, location_id: i64, did: String, cid: String, target_dir: String,
) -> CommandResponse<String> {
    let location_id = LocationId(location_id);
    log::info!(
        "Downloading AT Protocol blob: did={}, cid={}, target_dir={}",
        did,
        cid,
        target_dir
    );

    let downloaded = match state.atproto.blob_download(&did, &cid).await {
        Ok(value) => value,
        Err(error) => {
            log::error!("AT Protocol blob download failed: {}", error);
            return Ok(CommandResult::err(error));
        }
    };

    let extension = match infer_image_extension(downloaded.content_type.as_deref(), &downloaded.bytes) {
        Some(value) => value,
        None => {
            let error = AppError::new(
                ErrorCode::InvalidPath,
                "Blob is not a supported image (png, jpg, jpeg, gif, webp, svg)",
            );
            log::error!("Unsupported blob image format: did={}, cid={}", did, cid);
            return Ok(CommandResult::err(error));
        }
    };

    match state
        .store
        .image_import_bytes(location_id, &downloaded.bytes, extension, &target_dir)
    {
        Ok(rel_path) => {
            log::info!("blob_download: stored cid={} as {}", cid, rel_path);
            Ok(CommandResult::ok(rel_path))
        }
        Err(error) => {
            log::error!("blob_download image import failed: {}", error);
            Ok(CommandResult::err(error))
        }
    }
}

fn infer_image_extension(content_type: Option<&str>, bytes: &[u8]) -> Option<&'static str> {
    if let Some(mime) = content_type {
        let normalized = mime.trim().to_ascii_lowercase();
        if let Some(ext) = extension_from_content_type(&normalized) {
            return Some(ext);
        }
    }

    extension_from_bytes(bytes)
}

fn extension_from_content_type(mime: &str) -> Option<&'static str> {
    match mime {
        "image/png" => Some("png"),
        "image/jpeg" => Some("jpg"),
        "image/gif" => Some("gif"),
        "image/webp" => Some("webp"),
        "image/svg+xml" => Some("svg"),
        _ => None,
    }
}

fn extension_from_bytes(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(&[0x89, b'P', b'N', b'G', b'\r', b'\n', 0x1a, b'\n']) {
        return Some("png");
    }

    if bytes.starts_with(&[0xff, 0xd8, 0xff]) {
        return Some("jpg");
    }

    if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        return Some("gif");
    }

    if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        return Some("webp");
    }

    let probe_len = bytes.len().min(512);
    let probe = std::str::from_utf8(&bytes[..probe_len])
        .ok()?
        .trim_start_matches('\u{feff}')
        .trim_start();
    if probe.starts_with("<svg") || probe.starts_with("<?xml") && probe.contains("<svg") {
        return Some("svg");
    }

    None
}
