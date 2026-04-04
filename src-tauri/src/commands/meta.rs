use serde::Serialize;
use crate::error::Result;

#[derive(Debug, Serialize)]
pub struct PlatformInfo {
    pub os:   String,
    pub arch: String,
}

/// Returns the app version from Cargo.toml.
#[tauri::command]
pub async fn app_version() -> Result<String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

/// Returns OS and arch for the settings page.
#[tauri::command]
pub async fn platform_info() -> Result<PlatformInfo> {
    Ok(PlatformInfo {
        os:   std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    })
}
