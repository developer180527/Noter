// ─────────────────────────────────────────────────────────────────────────────
// Bridge Index
// Auto-detects whether we're running inside Tauri or a plain browser,
// and exports the correct bridge implementations.
//
// Import pattern in features:
//   import { bridge } from "@/bridge";
//   const text = await bridge.fs.readText(path);
// ─────────────────────────────────────────────────────────────────────────────

import { tauriFileSystem } from "./file-system.tauri";
import { pwaFileSystem   } from "./file-system.pwa";
import type { AppBridge, Platform } from "./types";

// ── Platform detection ────────────────────────────────────────────────────────
// Tauri injects `window.__TAURI_INTERNALS__` at runtime.

export const platform: Platform =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
    ? "tauri"
    : "pwa";

export const isTauri = platform === "tauri";
export const isPwa   = platform === "pwa";

// ── Notification bridge ───────────────────────────────────────────────────────

const notificationBridge: AppBridge["notification"] = {
  async requestPermission() {
    if (!("Notification" in window)) return "denied";
    return Notification.requestPermission();
  },
  show(title, body, _icon) {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  },
};

// ── Clipboard bridge ──────────────────────────────────────────────────────────

const clipboardBridge: AppBridge["clipboard"] = {
  async read() {
    if (isTauri) {
      // Dynamic import so the PWA bundle never references Tauri modules
      const mod = await import("@tauri-apps/plugin-clipboard-manager" as string) as { readText: () => Promise<string | null> };
      return (await mod.readText()) ?? "";
    }
    return navigator.clipboard.readText();
  },
  async write(text) {
    if (isTauri) {
      const mod = await import("@tauri-apps/plugin-clipboard-manager" as string) as { writeText: (s: string) => Promise<void> };
      await mod.writeText(text);
      return;
    }
    await navigator.clipboard.writeText(text);
  },
};

// ── Assembled bridge ──────────────────────────────────────────────────────────

export const bridge: AppBridge = {
  platform,
  fs:           isTauri ? tauriFileSystem : pwaFileSystem,
  notification: notificationBridge,
  clipboard:    clipboardBridge,
};

export type { AppBridge, Platform, FileSystemBridge } from "./types";
