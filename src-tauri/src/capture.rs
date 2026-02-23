use super::AppState;
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use writer_core::{AppError, DocId, ErrorCode, LocationId};
use writer_store::{CaptureMode, GlobalCaptureSettings};

const QUICK_CAPTURE_WINDOW_LABEL: &str = "quick_capture";
const MAIN_WINDOW_LABEL: &str = "main";
const TRAY_ICON_ID: &str = "global_capture_tray";

const MENU_ITEM_NEW_QUICK_NOTE: &str = "capture.new_quick_note";
const MENU_ITEM_OPEN_WRITER: &str = "capture.open_writer";
const MENU_ITEM_TOGGLE_SHORTCUT: &str = "capture.toggle_shortcut";
const MENU_ITEM_QUIT: &str = "capture.quit";
const MENU_ITEM_SHORTCUT_STATUS: &str = "capture.status.shortcut";
const MENU_ITEM_TARGET_STATUS: &str = "capture.status.target";

/// Ensures the quick capture window exists and returns it.
pub fn ensure_quick_capture_window(app: &AppHandle) -> Result<WebviewWindow, AppError> {
    if let Some(window) = app.get_webview_window(QUICK_CAPTURE_WINDOW_LABEL) {
        return Ok(window);
    }

    let window = WebviewWindowBuilder::new(app, QUICK_CAPTURE_WINDOW_LABEL, WebviewUrl::App("/".into()))
        .title("Quick Capture")
        .inner_size(480.0, 320.0)
        .resizable(false)
        .always_on_top(true)
        .visible(false)
        .center()
        .focused(true)
        .build()
        .map_err(|e| AppError::io(format!("Failed to create quick capture window: {}", e)))?;

    Ok(window)
}

/// Shows and focuses the quick capture window.
pub fn show_quick_capture_window(app: &AppHandle) -> Result<(), AppError> {
    let window = ensure_quick_capture_window(app)?;

    window
        .show()
        .map_err(|e| AppError::io(format!("Failed to show window: {}", e)))?;
    window
        .set_focus()
        .map_err(|e| AppError::io(format!("Failed to focus window: {}", e)))?;

    Ok(())
}

/// Shows and focuses the main window.
pub fn show_main_window(app: &AppHandle) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        window
            .show()
            .map_err(|e| AppError::io(format!("Failed to show main window: {}", e)))?;
        window
            .set_focus()
            .map_err(|e| AppError::io(format!("Failed to focus main window: {}", e)))?;
    }
    Ok(())
}

/// Registers a global shortcut.
pub fn register_global_shortcut(app: &AppHandle, shortcut_str: &str) -> Result<(), AppError> {
    let shortcut = parse_shortcut(shortcut_str)?;

    app.global_shortcut()
        .on_shortcut(shortcut, move |app, shortcut, event| {
            if event.state == ShortcutState::Pressed {
                tracing::info!("Global shortcut triggered: {:?}", shortcut);
                if let Err(e) = show_quick_capture_window(app) {
                    tracing::error!("Failed to show quick capture window: {}", e);
                }
            }
        })
        .map_err(|e| {
            AppError::new(
                ErrorCode::PermissionDenied,
                format!(
                    "Failed to register global shortcut: {}. This may be due to a conflict with another application.",
                    e
                ),
            )
        })?;

    tracing::info!("Global shortcut registered: {}", shortcut_str);
    Ok(())
}

/// Reconciles shortcut registration based on current settings.
pub fn reconcile_shortcut_registration(app: &AppHandle, settings: &GlobalCaptureSettings) -> Result<(), AppError> {
    let gs = app.global_shortcut();
    if let Err(e) = gs.unregister_all() {
        tracing::warn!("Failed to unregister existing shortcuts: {}", e);
    }

    if settings.enabled && !settings.paused {
        register_global_shortcut(app, &settings.shortcut)?;
    }

    Ok(())
}

fn tray_pause_label(paused: bool) -> &'static str {
    if paused { "Resume Shortcut" } else { "Pause Shortcut" }
}

fn tray_shortcut_status(settings: &GlobalCaptureSettings) -> String {
    if !settings.enabled {
        return "Shortcut: Disabled".to_string();
    }
    if settings.paused {
        return format!("Shortcut: Paused ({})", settings.shortcut);
    }
    format!("Shortcut: {}", settings.shortcut)
}

fn tray_target_status(settings: &GlobalCaptureSettings) -> String {
    match settings.last_capture_target.as_deref() {
        Some(target) => format!("Last target: {}", target),
        None => "Last target: none".to_string(),
    }
}

fn toggle_shortcut_pause_from_tray(app: &AppHandle) -> Result<(), AppError> {
    let state = app.state::<AppState>();
    let mut settings = state.store.global_capture_get()?;
    settings.paused = !settings.paused;
    state.store.global_capture_set(&settings)?;
    reconcile_shortcut_registration(app, &settings)?;
    build_or_update_tray_menu(app, &settings)?;
    Ok(())
}

fn handle_tray_menu_action(app: &AppHandle, item_id: &str) -> Result<(), AppError> {
    match item_id {
        MENU_ITEM_NEW_QUICK_NOTE => show_quick_capture_window(app),
        MENU_ITEM_OPEN_WRITER => show_main_window(app),
        MENU_ITEM_TOGGLE_SHORTCUT => toggle_shortcut_pause_from_tray(app),
        MENU_ITEM_QUIT => {
            app.exit(0);
            Ok(())
        }
        _ => Ok(()),
    }
}

/// Builds or updates tray menu/icon according to current global capture settings.
pub fn build_or_update_tray_menu(app: &AppHandle, settings: &GlobalCaptureSettings) -> Result<(), AppError> {
    if !settings.show_tray_icon {
        if let Some(tray) = app.tray_by_id(TRAY_ICON_ID) {
            tray.set_visible(false)
                .map_err(|e| AppError::io(format!("Failed to hide tray icon: {}", e)))?;
        }
        return Ok(());
    }

    let new_quick_note = MenuItem::with_id(app, MENU_ITEM_NEW_QUICK_NOTE, "New Quick Note", true, None::<&str>)
        .map_err(|e| AppError::io(format!("Failed to create tray menu item: {}", e)))?;
    let open_writer = MenuItem::with_id(app, MENU_ITEM_OPEN_WRITER, "Open Writer", true, None::<&str>)
        .map_err(|e| AppError::io(format!("Failed to create tray menu item: {}", e)))?;
    let toggle_shortcut = MenuItem::with_id(
        app,
        MENU_ITEM_TOGGLE_SHORTCUT,
        tray_pause_label(settings.paused),
        true,
        None::<&str>,
    )
    .map_err(|e| AppError::io(format!("Failed to create tray menu item: {}", e)))?;
    let shortcut_status = MenuItem::with_id(
        app,
        MENU_ITEM_SHORTCUT_STATUS,
        tray_shortcut_status(settings),
        false,
        None::<&str>,
    )
    .map_err(|e| AppError::io(format!("Failed to create tray menu item: {}", e)))?;
    let target_status = MenuItem::with_id(
        app,
        MENU_ITEM_TARGET_STATUS,
        tray_target_status(settings),
        false,
        None::<&str>,
    )
    .map_err(|e| AppError::io(format!("Failed to create tray menu item: {}", e)))?;
    let separator_a = PredefinedMenuItem::separator(app)
        .map_err(|e| AppError::io(format!("Failed to create tray menu separator: {}", e)))?;
    let separator_b = PredefinedMenuItem::separator(app)
        .map_err(|e| AppError::io(format!("Failed to create tray menu separator: {}", e)))?;
    let quit = MenuItem::with_id(app, MENU_ITEM_QUIT, "Quit", true, None::<&str>)
        .map_err(|e| AppError::io(format!("Failed to create tray menu item: {}", e)))?;

    let menu = Menu::with_items(
        app,
        &[
            &new_quick_note,
            &open_writer,
            &toggle_shortcut,
            &separator_a,
            &shortcut_status,
            &target_status,
            &separator_b,
            &quit,
        ],
    )
    .map_err(|e| AppError::io(format!("Failed to build tray menu: {}", e)))?;

    if let Some(tray) = app.tray_by_id(TRAY_ICON_ID) {
        tray.set_menu(Some(menu))
            .map_err(|e| AppError::io(format!("Failed to update tray menu: {}", e)))?;
        tray.set_visible(true)
            .map_err(|e| AppError::io(format!("Failed to show tray icon: {}", e)))?;
        return Ok(());
    }

    let mut builder = TrayIconBuilder::with_id(TRAY_ICON_ID)
        .menu(&menu)
        .tooltip("Writer")
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            let menu_id = event.id().as_ref();
            if let Err(e) = handle_tray_menu_action(app, menu_id) {
                tracing::error!("Tray menu action failed ({}): {}", menu_id, e);
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder
        .build(app)
        .map_err(|e| AppError::io(format!("Failed to create tray icon: {}", e)))?;

    Ok(())
}

/// Reconciles all runtime capture integrations (shortcut + tray).
pub fn reconcile_capture_runtime(app: &AppHandle, settings: &GlobalCaptureSettings) -> Result<(), AppError> {
    reconcile_shortcut_registration(app, settings)?;
    build_or_update_tray_menu(app, settings)?;
    Ok(())
}

/// Parses a shortcut string into a Shortcut object.
fn parse_shortcut(shortcut_str: &str) -> Result<Shortcut, AppError> {
    shortcut_str.parse().map_err(|e| {
        AppError::new(
            ErrorCode::InvalidPath,
            format!("Invalid shortcut format '{}': {}", shortcut_str, e),
        )
    })
}

/// Generates a filename for a quick note capture.
pub fn generate_quick_note_path(inbox_dir: &str) -> PathBuf {
    let now = chrono::Local::now();
    let year = now.format("%Y").to_string();
    let filename = now.format("%Y-%m-%d_%H-%M-%S%.3f.md").to_string();

    PathBuf::from(inbox_dir).join(year).join(filename)
}

/// Validates a shortcut string format.
pub fn validate_shortcut_format(shortcut: &str) -> Result<(), AppError> {
    if shortcut.trim().is_empty() {
        return Err(AppError::new(ErrorCode::InvalidPath, "Shortcut cannot be empty"));
    }

    let _: Shortcut = shortcut
        .parse()
        .map_err(|e| AppError::new(ErrorCode::InvalidPath, format!("Invalid shortcut format: {}", e)))?;

    Ok(())
}

/// Handles capture submission based on mode.
pub async fn handle_capture_submit(
    app: &AppHandle, mode: CaptureMode, text: String, target_location_id: Option<i64>, inbox_dir: &str,
    append_target: &Option<writer_store::CaptureDocRef>, close_after_save: bool,
) -> Result<CaptureSubmitResult, AppError> {
    let state = app.state::<AppState>();

    if text.trim().is_empty() {
        return Err(AppError::new(ErrorCode::InvalidPath, "Capture text cannot be empty"));
    }

    let location_id = match target_location_id {
        Some(id) => LocationId(id),
        None => {
            let locations = state.store.location_list()?;
            match locations.first() {
                Some(loc) => loc.id,
                None => {
                    return Err(AppError::new(
                        ErrorCode::NotFound,
                        "No location configured. Please add a location first.",
                    ));
                }
            }
        }
    };

    match mode {
        CaptureMode::QuickNote => {
            let rel_path = generate_quick_note_path(inbox_dir);
            let doc_id = DocId::new(location_id, rel_path.clone())?;
            let result = state.store.doc_save(&doc_id, &text, None)?;
            let target_str = format!("{}/{}", location_id.0, rel_path.to_string_lossy());

            Ok(CaptureSubmitResult {
                success: result.success,
                saved_to: Some(rel_path.to_string_lossy().to_string()),
                location_id: location_id.0,
                should_close: close_after_save,
                last_capture_target: Some(target_str),
            })
        }
        CaptureMode::Append => {
            let target = match append_target {
                Some(t) => t,
                None => {
                    return Err(AppError::new(ErrorCode::InvalidPath, "No append target configured"));
                }
            };

            let target_location = LocationId(target.location_id);
            let rel_path = PathBuf::from(&target.rel_path);
            let doc_id = DocId::new(target_location, rel_path)?;
            let existing_text = state.store.doc_open(&doc_id).map(|c| c.text).unwrap_or_default();
            let new_text = if existing_text.is_empty() { text } else { format!("{}\n\n{}", existing_text, text) };
            let result = state.store.doc_save(&doc_id, &new_text, None)?;
            let target_str = format!("{}/{}", target.location_id, target.rel_path);

            Ok(CaptureSubmitResult {
                success: result.success,
                saved_to: Some(target.rel_path.clone()),
                location_id: target.location_id,
                should_close: close_after_save,
                last_capture_target: Some(target_str),
            })
        }
        CaptureMode::WritingSession => {
            let rel_path = generate_quick_note_path(inbox_dir);
            let doc_id = DocId::new(location_id, rel_path.clone())?;
            let result = state.store.doc_save(&doc_id, &text, None)?;
            let target_str = format!("{}/{}", location_id.0, rel_path.to_string_lossy());

            Ok(CaptureSubmitResult {
                success: result.success,
                saved_to: Some(rel_path.to_string_lossy().to_string()),
                location_id: location_id.0,
                should_close: false,
                last_capture_target: Some(target_str),
            })
        }
    }
}

/// Result of a capture submission.
#[derive(Debug, Clone, serde::Serialize)]
pub struct CaptureSubmitResult {
    pub success: bool,
    pub saved_to: Option<String>,
    pub location_id: i64,
    pub should_close: bool,
    pub last_capture_target: Option<String>,
}

/// Updates the last capture target in settings and refreshes tray status text.
pub fn update_last_capture_target(app: &AppHandle, target: Option<String>) -> Result<(), AppError> {
    let state = app.state::<AppState>();
    let mut settings = state.store.global_capture_get()?;
    settings.last_capture_target = target;
    state.store.global_capture_set(&settings)?;
    build_or_update_tray_menu(app, &settings)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{generate_quick_note_path, validate_shortcut_format};

    #[test]
    fn validate_shortcut_accepts_known_valid_shortcuts() {
        assert!(validate_shortcut_format("CommandOrControl+Shift+Space").is_ok());
        assert!(validate_shortcut_format("Alt+KeyN").is_ok());
    }

    #[test]
    fn validate_shortcut_rejects_empty_shortcut() {
        assert!(validate_shortcut_format("").is_err());
        assert!(validate_shortcut_format("   ").is_err());
    }

    #[test]
    fn generate_quick_note_path_uses_inbox_year_and_markdown_extension() {
        let path = generate_quick_note_path("inbox");
        let path_str = path.to_string_lossy();
        let parts: Vec<&str> = path_str.split('/').collect();

        assert!(parts.len() >= 3);
        assert_eq!(parts[0], "inbox");
        assert_eq!(parts[1].len(), 4);
        assert!(parts[2].ends_with(".md"));
    }
}
