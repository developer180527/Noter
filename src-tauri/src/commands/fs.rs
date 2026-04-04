// ─────────────────────────────────────────────────────────────────────────────
// commands/fs.rs
// Tauri commands that give the PWA frontend access to the real file system.
// Notes are stored as individual JSON files: <app-data>/notes/<id>.json
// ─────────────────────────────────────────────────────────────────────────────

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::State;
use tracing::{debug, warn};

use crate::{
    error::{NoterError, Result},
    AppState,
};

// ── Note wire type (mirrors the frontend Note interface) ──────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NoteFile {
    pub id:         String,
    pub title:      String,
    pub body:       String,
    pub tags:       Vec<String>,
    pub pinned:     bool,
    pub archived:   bool,
    pub color:      Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn validate_id(id: &str) -> Result<()> {
    // Allow alphanumeric + hyphen + underscore only (nanoid output is safe but let's be explicit)
    if id.is_empty() || id.len() > 64 || !id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
        return Err(NoterError::InvalidId(id.to_string()));
    }
    Ok(())
}

fn note_path(notes_dir: &PathBuf, id: &str) -> PathBuf {
    notes_dir.join(format!("{id}.json"))
}

// ── Commands ──────────────────────────────────────────────────────────────────

/// Ensure the notes directory exists. Call once at startup.
#[tauri::command]
pub async fn ensure_notes_dir(state: State<'_, AppState>) -> Result<String> {
    tokio::fs::create_dir_all(&state.notes_dir).await?;
    Ok(state.notes_dir.to_string_lossy().into_owned())
}

/// Read a single note by ID.
#[tauri::command]
pub async fn read_note(id: String, state: State<'_, AppState>) -> Result<NoteFile> {
    validate_id(&id)?;
    let path = note_path(&state.notes_dir, &id);
    debug!("read_note: {:?}", path);

    if !path.exists() {
        return Err(NoterError::NotFound(id));
    }

    let raw = tokio::fs::read_to_string(&path).await?;
    let note: NoteFile = serde_json::from_str(&raw)?;
    Ok(note)
}

/// Write (create or update) a note. The frontend owns the ID.
#[tauri::command]
pub async fn write_note(note: NoteFile, state: State<'_, AppState>) -> Result<()> {
    validate_id(&note.id)?;
    let path = note_path(&state.notes_dir, &note.id);
    debug!("write_note: {:?}", path);

    let json = serde_json::to_string_pretty(&note)?;
    tokio::fs::write(&path, json).await?;
    Ok(())
}

/// Delete a note by ID.
#[tauri::command]
pub async fn delete_note(id: String, state: State<'_, AppState>) -> Result<()> {
    validate_id(&id)?;
    let path = note_path(&state.notes_dir, &id);

    if !path.exists() {
        warn!("delete_note: note not found: {}", id);
        return Ok(()); // Idempotent
    }

    tokio::fs::remove_file(&path).await?;
    debug!("delete_note: deleted {:?}", path);
    Ok(())
}

/// List all note IDs in the notes directory.
#[tauri::command]
pub async fn list_notes(state: State<'_, AppState>) -> Result<Vec<String>> {
    let mut ids = Vec::new();
    let mut dir = tokio::fs::read_dir(&state.notes_dir).await?;

    while let Some(entry) = dir.next_entry().await? {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.ends_with(".json") {
            let id = name.trim_end_matches(".json").to_string();
            if validate_id(&id).is_ok() {
                ids.push(id);
            }
        }
    }

    Ok(ids)
}
