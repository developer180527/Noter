// ─────────────────────────────────────────────────────────────────────────────
// bridge/tauri-commands.ts
// Typed wrappers for every Tauri command defined in src-tauri/src/commands/.
// Import from here — never call invoke() with raw string literals in feature code.
// ─────────────────────────────────────────────────────────────────────────────

import { isTauri } from "./index";

// Lazy-load invoke so the PWA bundle doesn't include Tauri code
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

// ── Wire types (mirror Rust structs) ──────────────────────────────────────────

export interface NoteFile {
  id:        string;
  title:     string;
  body:      string;
  tags:      string[];
  pinned:    boolean;
  archived:  boolean;
  color:     string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PlatformInfo {
  os:   string;
  arch: string;
}

// ── Commands ──────────────────────────────────────────────────────────────────

/** Only call in Tauri context — check `isTauri` first. */
export const tauriCommands = {
  async ensureNotesDir(): Promise<string> {
    return invoke<string>("ensure_notes_dir");
  },

  async readNote(id: string): Promise<NoteFile> {
    return invoke<NoteFile>("read_note", { id });
  },

  async writeNote(note: NoteFile): Promise<void> {
    return invoke<void>("write_note", { note });
  },

  async deleteNote(id: string): Promise<void> {
    return invoke<void>("delete_note", { id });
  },

  async listNotes(): Promise<string[]> {
    return invoke<string[]>("list_notes");
  },

  async appVersion(): Promise<string> {
    return invoke<string>("app_version");
  },

  async platformInfo(): Promise<PlatformInfo> {
    return invoke<PlatformInfo>("platform_info");
  },
} as const;

// ── Convenience guard ─────────────────────────────────────────────────────────

/** Runs fn only when inside Tauri, silently skips in PWA mode. */
export async function whenTauri<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!isTauri) return null;
  return fn();
}
