use tauri::Manager;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};

mod capture;
mod commands;
mod locations;

use commands as cmd;

pub use commands::AppState;

const LOG_FILE_MAX_BYTES: u128 = 1_000_000;
const LOG_FILE_RETENTION_COUNT: usize = 10;

fn build_log_plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let mut log_builder = tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Debug)
        .rotation_strategy(RotationStrategy::KeepSome(LOG_FILE_RETENTION_COUNT))
        .max_file_size(LOG_FILE_MAX_BYTES)
        .timezone_strategy(TimezoneStrategy::UseLocal)
        .clear_targets()
        .target(Target::new(TargetKind::Stdout));

    if let Ok(store_dir) = writer_store::Store::default_app_dir() {
        log_builder = log_builder.target(Target::new(TargetKind::Folder {
            path: store_dir.join("logs"),
            file_name: Some("writer".to_string()),
        }));
    } else {
        eprintln!("Falling back to OS log directory because store directory could not be resolved.");
        log_builder = log_builder.target(Target::new(TargetKind::LogDir {
            file_name: Some("writer".to_string()),
        }));
    }

    log_builder.build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(build_log_plugin())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            log::info!("Initializing application");

            let store = match writer_store::Store::open_default() {
                Ok(store) => {
                    log::info!("Store initialized successfully");
                    store
                }
                Err(e) => {
                    log::error!("Failed to initialize store: {}", e);
                    return Err(Box::new(e));
                }
            };

            let app_state = AppState::new(store);
            app.manage(app_state);

            if let Err(e) = locations::reconcile(app.handle()) {
                log::error!("Location reconciliation failed: {}", e);
            }

            let state = app.state::<AppState>();
            match state.store.global_capture_get() {
                Ok(settings) => {
                    if let Err(e) = capture::reconcile_capture_runtime(app.handle(), &settings) {
                        log::warn!("Failed to initialize global capture runtime: {}", e);
                    }
                }
                Err(e) => {
                    log::warn!("Failed to load global capture settings: {}", e);
                }
            }

            log::info!("Application setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cmd::app_version_get,
            cmd::location_add_via_dialog,
            cmd::location_list,
            cmd::location_remove,
            cmd::location_validate,
            cmd::doc_list,
            cmd::doc_open,
            cmd::doc_save,
            cmd::doc_exists,
            cmd::doc_rename,
            cmd::doc_move,
            cmd::doc_delete,
            cmd::dir_create,
            cmd::dir_rename,
            cmd::dir_move,
            cmd::dir_delete,
            cmd::watch_enable,
            cmd::watch_disable,
            cmd::search,
            cmd::markdown_render,
            cmd::markdown_render_for_pdf,
            cmd::markdown_render_for_text,
            cmd::markdown_render_for_docx,
            cmd::ui_layout_get,
            cmd::ui_layout_set,
            cmd::session_get,
            cmd::session_open_tab,
            cmd::session_select_tab,
            cmd::session_close_tab,
            cmd::session_reorder_tabs,
            cmd::session_mark_tab_modified,
            cmd::session_update_tab_doc,
            cmd::session_drop_doc,
            cmd::session_prune_locations,
            cmd::session_last_doc_get,
            cmd::session_last_doc_set,
            cmd::style_check_get,
            cmd::style_check_set,
            cmd::style_check_scan,
            cmd::global_capture_get,
            cmd::global_capture_set,
            cmd::global_capture_open,
            cmd::global_capture_submit,
            cmd::global_capture_pause,
            cmd::global_capture_validate_shortcut,
            cmd::markdown_help_get,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
