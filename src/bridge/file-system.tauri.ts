// ─────────────────────────────────────────────────────────────────────────────
// Tauri FileSystem Bridge
// Wraps @tauri-apps/plugin-fs and tauri commands for file system access.
// ─────────────────────────────────────────────────────────────────────────────

import type { FileSystemBridge, FilePickerOptions, SavePickerOptions } from "./types";

// Lazy imports so the tauri modules aren't bundled in PWA mode
async function getTauriFs() {
  return import("@tauri-apps/plugin-fs");
}
async function getTauriPath() {
  return import("@tauri-apps/api/path");
}
async function getTauriDialog() {
  // @tauri-apps/plugin-dialog — add to dependencies if dialog features needed
  try {
    return await import("@tauri-apps/plugin-dialog" as string);
  } catch {
    return null;
  }
}

export const tauriFileSystem: FileSystemBridge = {
  async readText(path: string): Promise<string> {
    const fs = await getTauriFs();
    return await fs.readTextFile(path);
  },

  async writeText(path: string, content: string): Promise<void> {
    const fs = await getTauriFs();
    await fs.writeTextFile(path, content);
  },

  async remove(path: string): Promise<void> {
    const fs = await getTauriFs();
    await fs.remove(path);
  },

  async listDir(dir: string): Promise<string[]> {
    const fs = await getTauriFs();
    const entries = await fs.readDir(dir);
    return entries.map((e) => e.name ?? "").filter(Boolean);
  },

  async exists(path: string): Promise<boolean> {
    const fs = await getTauriFs();
    return await fs.exists(path);
  },

  async createDir(dir: string): Promise<void> {
    const fs = await getTauriFs();
    await fs.mkdir(dir, { recursive: true });
  },

  async appDataDir(): Promise<string> {
    const path = await getTauriPath();
    return await path.appDataDir();
  },

  async openFilePicker(opts?: FilePickerOptions): Promise<string[]> {
    const dialog = await getTauriDialog();
    if (!dialog) return [];
    const result = await dialog.open({
      multiple: opts?.multiple ?? false,
      filters:  opts?.filters,
      defaultPath: opts?.defaultPath,
    });
    if (!result) return [];
    return Array.isArray(result) ? result : [result];
  },

  async saveFilePicker(opts?: SavePickerOptions): Promise<string | null> {
    const dialog = await getTauriDialog();
    if (!dialog) return null;
    const result = await dialog.save({
      defaultPath: opts?.defaultPath,
      filters:     opts?.filters,
    });
    return result ?? null;
  },
};
