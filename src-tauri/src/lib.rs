use tauri::Manager;

mod capture;
mod commands;
mod locations;

use commands as cmd;

pub use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            tracing::info!("Initializing application");

            let store = match writer_store::Store::open_default() {
                Ok(store) => {
                    tracing::info!("Store initialized successfully");
                    store
                }
                Err(e) => {
                    tracing::error!("Failed to initialize store: {}", e);
                    return Err(Box::new(e));
                }
            };

            let app_state = AppState::new(store);
            app.manage(app_state);

            if let Err(e) = locations::reconcile(app.handle()) {
                tracing::error!("Location reconciliation failed: {}", e);
            }

            let state = app.state::<AppState>();
            match state.store.global_capture_get() {
                Ok(settings) => {
                    if let Err(e) = capture::reconcile_capture_runtime(app.handle(), &settings) {
                        tracing::warn!("Failed to initialize global capture runtime: {}", e);
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to load global capture settings: {}", e);
                }
            }

            tracing::info!("Application setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
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
            cmd::watch_enable,
            cmd::watch_disable,
            cmd::search,
            cmd::markdown_render,
            cmd::markdown_render_for_pdf,
            cmd::ui_layout_get,
            cmd::ui_layout_set,
            cmd::session_last_doc_get,
            cmd::session_last_doc_set,
            cmd::style_check_get,
            cmd::style_check_set,
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
