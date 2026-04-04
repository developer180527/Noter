// ─────────────────────────────────────────────────────────────────────────────
// Bridge Types
// The bridge abstracts Tauri-specific APIs behind platform-agnostic interfaces.
// Code that uses the bridge works identically in Tauri and in a browser PWA.
// ─────────────────────────────────────────────────────────────────────────────

export type Platform = "tauri" | "pwa";

export interface FileSystemBridge {
  /** Read a file as UTF-8 text. */
  readText(path: string): Promise<string>;
  /** Write UTF-8 text to a file, creating it if needed. */
  writeText(path: string, content: string): Promise<void>;
  /** Delete a file. */
  remove(path: string): Promise<void>;
  /** List files in a directory. Returns filenames. */
  listDir(dir: string): Promise<string[]>;
  /** Check if a file exists. */
  exists(path: string): Promise<boolean>;
  /** Create a directory (and parents) if it doesn't exist. */
  createDir(dir: string): Promise<void>;
  /** Returns the app's data directory (e.g. ~/Library/Application Support/noter). */
  appDataDir(): Promise<string>;
  /** Opens a native file-picker. Returns selected file paths. */
  openFilePicker(opts?: FilePickerOptions): Promise<string[]>;
  /** Opens a native save dialog. Returns chosen path or null. */
  saveFilePicker(opts?: SavePickerOptions): Promise<string | null>;
}

export interface FilePickerOptions {
  multiple?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
  defaultPath?: string;
}

export interface SavePickerOptions {
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface NotificationBridge {
  requestPermission(): Promise<"granted" | "denied" | "default">;
  show(title: string, body?: string, icon?: string): void;
}

export interface ClipboardBridge {
  read(): Promise<string>;
  write(text: string): Promise<void>;
}

/** The full bridge surface exposed to the app. */
export interface AppBridge {
  readonly platform: Platform;
  readonly fs: FileSystemBridge;
  readonly notification: NotificationBridge;
  readonly clipboard: ClipboardBridge;
}
