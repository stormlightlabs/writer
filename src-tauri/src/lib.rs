use tauri::Manager;

mod commands;
use commands::{
    doc_exists, doc_list, doc_open, doc_save, location_add_via_dialog, location_list, location_remove,
    location_validate,
};

pub use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_store::Builder::default().build())
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

            if let Err(e) = commands::reconcile_locations(app.handle()) {
                tracing::error!("Location reconciliation failed: {}", e);
            }

            tracing::info!("Application setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            location_add_via_dialog,
            location_list,
            location_remove,
            location_validate,
            doc_list,
            doc_open,
            doc_save,
            doc_exists
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
