// ─────────────────────────────────────────────────────────────────────────────
// PluginManager
// Scans ~/.config/noter/plugins/, loads manifests, builds PluginContexts,
// reads plugin.js as text, imports via Blob URL (bypasses asset protocol CSP).
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PluginManifest } from "./manifest";
import { validateManifest } from "./manifest";
import { buildPluginContext } from "./context";
import type { KernelInterface, EventBusInterface } from "../types";

// ── Plugin record ─────────────────────────────────────────────────────────────

export type PluginStatus = "loading" | "active" | "disabled" | "error";

export interface LoadedPlugin {
  manifest:   PluginManifest;
  status:     PluginStatus;
  error?:     string;
  cleanup?:   () => void;
  enabledAt?: number;
}

// ── Plugin store ──────────────────────────────────────────────────────────────

interface PluginStoreState {
  plugins:     Record<string, LoadedPlugin>;
  disabledIds: string[];
}
interface PluginStoreActions {
  _setPlugin(id: string, plugin: LoadedPlugin): void;
  _removePlugin(id: string): void;
  setDisabled(id: string, disabled: boolean): void;
  isDisabled(id: string): boolean;
}

export const usePluginStore = create<PluginStoreState & PluginStoreActions>()(
  persist(
    (set, get) => ({
      plugins:     {},
      disabledIds: [],

      _setPlugin(id, plugin) {
        set((s) => ({ plugins: { ...s.plugins, [id]: plugin } }));
      },
      _removePlugin(id) {
        set((s) => {
          const { [id]: _, ...rest } = s.plugins;
          return { plugins: rest };
        });
      },
      setDisabled(id, disabled) {
        set((s) => ({
          disabledIds: disabled
            ? [...s.disabledIds, id]
            : s.disabledIds.filter((d) => d !== id),
        }));
      },
      isDisabled(id) {
        return get().disabledIds.includes(id);
      },
    }),
    {
      name: "noter:plugins-v1",
      partialize: (s) => ({ disabledIds: s.disabledIds }),
    }
  )
);

// ── PluginManager ─────────────────────────────────────────────────────────────

export class PluginManager {
  private kernel:   KernelInterface;
  private eventBus: EventBusInterface;

  constructor(kernel: KernelInterface, eventBus: EventBusInterface) {
    this.kernel   = kernel;
    this.eventBus = eventBus;
  }

  async loadAll(): Promise<void> {
    const isTauri = "__TAURI_INTERNALS__" in window;
    if (!isTauri) {
      console.info("[PluginManager] Not in Tauri — skipping disk scan.");
      return;
    }

    let pluginDirs: string[] = [];
    try {
      const { readDir }      = await import("@tauri-apps/plugin-fs");
      const { appDataDir }   = await import("@tauri-apps/api/path");
      const { join }         = await import("@tauri-apps/api/path");
      const dataDir          = await appDataDir();
      const pluginsDir       = await join(dataDir, "plugins");
      const entries          = await readDir(pluginsDir);
      pluginDirs = entries
        .filter((e: { isDirectory?: boolean; name?: string }) => e.isDirectory && e.name)
        .map((e: { name: string }) => e.name);
    } catch (e) {
      console.warn("[PluginManager] Could not read plugins directory:", e);
      return;
    }

    for (const dir of pluginDirs) {
      await this.loadPlugin(dir);
    }
  }

  async loadPlugin(folderName: string): Promise<void> {
    const store   = usePluginStore.getState();
    const isTauri = "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;

    // ── Read and validate manifest ────────────────────────────────────────────
    let manifest: PluginManifest;
    try {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const { appDataDir }   = await import("@tauri-apps/api/path");
      const { join }         = await import("@tauri-apps/api/path");
      const dataDir          = await appDataDir();
      const manifestPath     = await join(dataDir, "plugins", folderName, "manifest.json");

      const raw    = await readTextFile(manifestPath);
      const parsed = JSON.parse(raw);
      const errors = validateManifest(parsed);

      if (errors.length > 0) {
        console.error(`[PluginManager] Invalid manifest for ${folderName}:`, errors);
        store._setPlugin(folderName, {
          manifest: { id: folderName, name: folderName, version: "0.0.0", permissions: [] },
          status:   "error",
          error:    `Invalid manifest: ${errors.join(", ")}`,
        });
        return;
      }
      manifest = parsed as PluginManifest;
    } catch (e) {
      console.error(`[PluginManager] Failed to read manifest for ${folderName}:`, e);
      return;
    }

    // ── Check disabled ────────────────────────────────────────────────────────
    if (store.isDisabled(manifest.id)) {
      store._setPlugin(manifest.id, { manifest, status: "disabled" });
      return;
    }

    store._setPlugin(manifest.id, { manifest, status: "loading" });

    // ── Build sandboxed context ───────────────────────────────────────────────
    const ctx = buildPluginContext(manifest, this.kernel, this.eventBus);

    // ── Load plugin.js via Blob URL ───────────────────────────────────────────
    // We read the file as text then create a Blob URL.
    // This bypasses the asset:// protocol and works with the blob: CSP directive.
    let blobUrl: string | null = null;
    try {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const { appDataDir }   = await import("@tauri-apps/api/path");
      const { join }         = await import("@tauri-apps/api/path");

      const dataDir      = await appDataDir();
      const entryPoint   = manifest.entryPoint ?? "plugin.js";
      const pluginPath   = await join(dataDir, "plugins", folderName, entryPoint);

      const code = await readTextFile(pluginPath);
      const blob = new Blob([code], { type: "text/javascript" });
      blobUrl    = URL.createObjectURL(blob);

      const mod = await import(/* @vite-ignore */ blobUrl);

      if (typeof mod.activate !== "function") {
        throw new Error("Plugin does not export an activate() function");
      }

      const cleanup = mod.activate(ctx);

      store._setPlugin(manifest.id, {
        manifest,
        status:    "active",
        cleanup:   typeof cleanup === "function" ? cleanup : undefined,
        enabledAt: Date.now(),
      });

      console.info(`[PluginManager] Loaded: ${manifest.name} v${manifest.version}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[PluginManager] Failed to activate ${manifest.id}:`, e);
      store._setPlugin(manifest.id, { manifest, status: "error", error: message });
    } finally {
      // Always revoke blob URL to free memory
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    }
  }

  unloadPlugin(id: string): void {
    const plugin = usePluginStore.getState().plugins[id];
    if (!plugin) return;
    try { plugin.cleanup?.(); } catch (e) {
      console.warn(`[PluginManager] Cleanup error for ${id}:`, e);
    }
    usePluginStore.getState()._removePlugin(id);
  }

  setEnabled(id: string, enabled: boolean): void {
    usePluginStore.getState().setDisabled(id, !enabled);
  }
}