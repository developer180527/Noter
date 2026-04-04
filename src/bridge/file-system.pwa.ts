// ─────────────────────────────────────────────────────────────────────────────
// PWA FileSystem Bridge
// Uses the File System Access API (Chrome/Edge) with localStorage fallback.
// For notes, we use IndexedDB/localStorage as the storage backend.
// ─────────────────────────────────────────────────────────────────────────────

import type { FileSystemBridge, FilePickerOptions, SavePickerOptions } from "./types";

// In PWA mode, "paths" are logical keys in localStorage / IndexedDB.
// Real file system access is available only via the File System Access API.

export const pwaFileSystem: FileSystemBridge = {
  async readText(path: string): Promise<string> {
    const value = localStorage.getItem(`noter:fs:${path}`);
    if (value === null) throw new Error(`File not found: ${path}`);
    return value;
  },

  async writeText(path: string, content: string): Promise<void> {
    localStorage.setItem(`noter:fs:${path}`, content);
  },

  async remove(path: string): Promise<void> {
    localStorage.removeItem(`noter:fs:${path}`);
  },

  async listDir(dir: string): Promise<string[]> {
    const prefix = `noter:fs:${dir}/`;
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));
  },

  async exists(path: string): Promise<boolean> {
    return localStorage.getItem(`noter:fs:${path}`) !== null;
  },

  async createDir(_dir: string): Promise<void> {
    // No-op in PWA — directories are implicit from paths
  },

  async appDataDir(): Promise<string> {
    return "noter://appdata";
  },

  async openFilePicker(opts?: FilePickerOptions): Promise<string[]> {
    // Use the File System Access API if available
    type ShowOpenFilePicker = (opts?: object) => Promise<Array<{ name: string }>>;
    const showOpen = (window as Window & { showOpenFilePicker?: ShowOpenFilePicker }).showOpenFilePicker;

    if (showOpen) {
      try {
        const handles = await showOpen({
          multiple: opts?.multiple ?? false,
          types: opts?.filters?.map((f) => ({
            description: f.name,
            accept: Object.fromEntries(
              f.extensions.map((ext) => [`application/${ext}`, [`.${ext}`]])
            ),
          })),
        });
        return handles.map((h) => h.name);
      } catch {
        return []; // User cancelled
      }
    }

    // Fallback: classic input[type=file]
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = opts?.multiple ?? false;
      if (opts?.filters) {
        input.accept = opts.filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(",");
      }
      input.onchange = () => {
        const files = Array.from(input.files ?? []);
        resolve(files.map((f) => f.name));
      };
      input.click();
    });
  },

  async saveFilePicker(_opts?: SavePickerOptions): Promise<string | null> {
    // In PWA mode, trigger a download — callers handle the actual blob
    return null;
  },
};
