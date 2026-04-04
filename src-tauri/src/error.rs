// ─────────────────────────────────────────────────────────────────────────────
// error.rs — Unified command error type
// Implements serde::Serialize so Tauri can serialise errors back to the frontend.
// ─────────────────────────────────────────────────────────────────────────────

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum NoterError {
    #[error("IO error: {0}")]
    Io(String),

    #[error("Serialisation error: {0}")]
    Serde(String),

    #[error("Note not found: {0}")]
    NotFound(String),

    #[error("Invalid note ID: {0}")]
    InvalidId(String),

    #[error("{0}")]
    Other(String),
}

impl From<std::io::Error> for NoterError {
    fn from(e: std::io::Error) -> Self {
        NoterError::Io(e.to_string())
    }
}

impl From<serde_json::Error> for NoterError {
    fn from(e: serde_json::Error) -> Self {
        NoterError::Serde(e.to_string())
    }
}

impl From<anyhow::Error> for NoterError {
    fn from(e: anyhow::Error) -> Self {
        NoterError::Other(e.to_string())
    }
}

pub type Result<T> = std::result::Result<T, NoterError>;
