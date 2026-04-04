// ─────────────────────────────────────────────────────────────────────────────
// noter — Tauri application library root
// ─────────────────────────────────────────────────────────────────────────────

pub mod commands;
pub mod error;

use tauri::Manager;
use tracing::info;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Structured logging
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "noter=debug,warn".to_string()),
        )
        .init();

    info!("noter starting up");

    tauri::Builder::default()
        // ── Plugins ──────────────────────────────────────────────────────────
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        // ── Commands ─────────────────────────────────────────────────────────
        .invoke_handler(tauri::generate_handler![
            commands::fs::read_note,
            commands::fs::write_note,
            commands::fs::delete_note,
            commands::fs::list_notes,
            commands::fs::ensure_notes_dir,
            commands::meta::app_version,
            commands::meta::platform_info,
        ])
        // ── Setup ────────────────────────────────────────────────────────────
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Could not resolve app data dir");
            let notes_dir = data_dir.join("notes");
            std::fs::create_dir_all(&notes_dir)?;
            info!("Notes directory: {:?}", notes_dir);

            // Store the notes dir path in app state so commands can access it
            app.manage(AppState { notes_dir });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running noter");
}

// ── App State ─────────────────────────────────────────────────────────────────

#[derive(Debug)]
pub struct AppState {
    pub notes_dir: std::path::PathBuf,
}
