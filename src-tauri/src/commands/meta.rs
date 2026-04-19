use serde::{Deserialize, Serialize};
use std::sync::atomic::Ordering;
use tauri::State;
use crate::error::Result;
use crate::AppState;
use crate::WindowGeometry;

#[derive(Debug, Serialize)]
pub struct PlatformInfo {
    pub os:   String,
    pub arch: String,
}

/// The full saved state written to window-state.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedState {
    pub geometry: WindowGeometry,
    pub persist:  bool,
}

#[tauri::command]
pub async fn app_version() -> Result<String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

#[tauri::command]
pub async fn platform_info() -> Result<PlatformInfo> {
    Ok(PlatformInfo {
        os:   std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    })
}

/// Called from JS when the "Remember window size" toggle changes.
#[tauri::command]
pub async fn set_window_persist(
    enabled: bool,
    state:   State<'_, AppState>,
) -> Result<()> {
    state.persist_window_size.store(enabled, Ordering::Relaxed);

    // Read current geometry from in-memory tracker
    let geom = state.current_geometry
        .lock()
        .map(|g| g.clone())
        .unwrap_or(WindowGeometry { width: 1200, height: 800, x: 0, y: 0 });

    // Write updated preference to disk immediately
    let saved = SavedState { geometry: geom, persist: enabled };
    if let Ok(json) = serde_json::to_string(&saved) {
        let _result = std::fs::write(&state.win_state_path, &json);
    }

    Ok(())
}