pub mod commands;
pub mod error;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::Manager;

/// Last known good window geometry — updated on every Resized/Moved event.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WindowGeometry {
    pub width:  u32,
    pub height: u32,
    pub x:      i32,
    pub y:      i32,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "noter=debug,warn".to_string()),
        )
        .init();


    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::fs::read_note,
            commands::fs::write_note,
            commands::fs::delete_note,
            commands::fs::list_notes,
            commands::fs::ensure_notes_dir,
            commands::meta::app_version,
            commands::meta::platform_info,
            commands::meta::set_window_persist,
        ])
        .setup(|app| {
            let data_dir = app.path().app_data_dir()
                .expect("Could not resolve app data dir");
            std::fs::create_dir_all(&data_dir)?;

            let notes_dir      = data_dir.join("notes");
            let win_state_path = data_dir.join("window-state.json");
            std::fs::create_dir_all(&notes_dir)?;

            // ── Read saved state ──────────────────────────────────────────
            let saved = read_state_file(&win_state_path);

            let initial_persist = saved.as_ref().map(|s| s.persist).unwrap_or(true);

            let persist_flag = Arc::new(AtomicBool::new(initial_persist));

            // ── Restore window size if enabled ────────────────────────────
            if initial_persist {
                if let Some(ref s) = saved {
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize {
                            width:  s.geometry.width  as f64,
                            height: s.geometry.height as f64,
                        }));
                        let _ = win.set_position(tauri::Position::Logical(tauri::LogicalPosition {
                            x: s.geometry.x as f64,
                            y: s.geometry.y as f64,
                        }));
                    }
                }
            }

            // ── Track current geometry in memory ──────────────────────────
            // Seed with saved geometry or defaults
            let initial_geom = saved.as_ref().map(|s| s.geometry.clone())
                .unwrap_or(WindowGeometry { width: 1200, height: 800, x: 0, y: 0 });
            let current_geom = Arc::new(Mutex::new(initial_geom));

            app.manage(AppState {
                notes_dir,
                win_state_path:      win_state_path.clone(),
                persist_window_size: Arc::clone(&persist_flag),
                current_geometry:    Arc::clone(&current_geom),
            });

            // ── Window event handler ─────────────────────────────────────
            // Strategy: write state file on EVERY resize/move (debounced 500ms)
            // so the file is always current regardless of how the app closes.
            // CloseRequested is an additional flush but not the primary save.
            let flag_r  = Arc::clone(&persist_flag);
            let geom_r  = Arc::clone(&current_geom);
            let path_r  = win_state_path.clone();

            // Tracks whether a debounce thread is pending
            let pending = Arc::new(std::sync::atomic::AtomicBool::new(false));

            let win = app.get_webview_window("main")
                .expect("no main window");
            let win_inner = win.clone();

            win.on_window_event(move |event| {
                match event {
                    tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Moved(_) => {
                        // 1. Update in-memory geometry
                        let scale = win_inner.scale_factor().unwrap_or(1.0);
                        let size  = match win_inner.outer_size() {
                            Ok(s) => s,
                            Err(_) => return,
                        };
                        let pos = match win_inner.outer_position() {
                            Ok(p) => p,
                            Err(_) => return,
                        };
                        let geom = WindowGeometry {
                            width:  (size.width  as f64 / scale).round() as u32,
                            height: (size.height as f64 / scale).round() as u32,
                            x:      (pos.x as f64 / scale).round() as i32,
                            y:      (pos.y as f64 / scale).round() as i32,
                        };
                        if let Ok(mut g) = geom_r.lock() {
                            *g = geom;
                        }

                        // 2. Debounced write — only spawn a new thread if none pending
                        if pending.compare_exchange(
                            false, true,
                            Ordering::SeqCst, Ordering::SeqCst
                        ).is_ok() {
                            let flag_d    = Arc::clone(&flag_r);
                            let geom_d    = Arc::clone(&geom_r);
                            let path_d    = path_r.clone();
                            let pending_d = Arc::clone(&pending);

                            std::thread::spawn(move || {
                                std::thread::sleep(std::time::Duration::from_millis(500));
                                let enabled = flag_d.load(Ordering::Relaxed);
                                let geom = geom_d.lock()
                                    .map(|g| g.clone())
                                    .unwrap_or(WindowGeometry { width: 1200, height: 800, x: 0, y: 0 });
                                let state = commands::meta::SavedState { geometry: geom, persist: enabled };
                                if let Ok(json) = serde_json::to_string(&state) {
                                    let _ = std::fs::write(&path_d, &json);
                                }
                                pending_d.store(false, Ordering::SeqCst);
                            });
                        }
                    }
                    tauri::WindowEvent::CloseRequested { .. } => {
                        // Immediate flush on close — catches cases where the user
                        // closes without resizing (so no debounce thread ran)
                        let enabled = flag_r.load(Ordering::Relaxed);
                        let geom = geom_r.lock()
                            .map(|g| g.clone())
                            .unwrap_or(WindowGeometry { width: 1200, height: 800, x: 0, y: 0 });
                        let state = commands::meta::SavedState { geometry: geom, persist: enabled };
                        if let Ok(json) = serde_json::to_string(&state) {
                            let _result = std::fs::write(&path_r, &json);
                        }
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running noter");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn read_state_file(path: &std::path::Path) -> Option<commands::meta::SavedState> {
    let raw = std::fs::read_to_string(path).ok()?;
    let s = serde_json::from_str::<commands::meta::SavedState>(&raw).ok()?;
    Some(s)
}

// ── App State ─────────────────────────────────────────────────────────────────

#[derive(Debug)]
pub struct AppState {
    pub notes_dir:           std::path::PathBuf,
    pub win_state_path:      std::path::PathBuf,
    pub persist_window_size: Arc<AtomicBool>,
    pub current_geometry:    Arc<Mutex<WindowGeometry>>,
}