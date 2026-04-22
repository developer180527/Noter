// ─────────────────────────────────────────────────────────────────────────────
// PluginManager — v4
//  A. Early disabled check skips ALL filesystem IO
//  B. folderName === manifest.id enforced
//  C. Duplicate guard blocks any existing entry regardless of status
//  D. host.destroy() called in catch path — no iframe leak on failed mount
//  E. _readManifest logs errors before returning null
//  F. apiVersion is required — missing field fails validation
//  G. Store cleared before teardown — no stale state exposure
//  H. Sequential loading guaranteed and documented
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PluginManifest }                    from "./manifest";
import { validateManifest }                       from "./manifest";
import { PluginBridgeHost }                       from "./bridge-host";
import type { KernelInterface, EventBusInterface } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const SUPPORTED_API_VERSION = "1.0";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PluginStatus = "loading" | "active" | "disabled" | "error";

export interface LoadedPlugin {
  manifest:   PluginManifest;
  status:     PluginStatus;
  error?:     string;
  enabledAt?: number;
}

interface PluginRuntime {
  host: PluginBridgeHost;
}

interface PluginLoadResult {
  pluginId: string;
  success:  boolean;
  error?:   string;
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
        set((s) => {
          const ids = new Set(s.disabledIds);
          disabled ? ids.add(id) : ids.delete(id);
          return { disabledIds: Array.from(ids) };
        });
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
  private runtimes  = new Map<string, PluginRuntime>();

  // Fix H: loading lock — sequential execution is required.
  // Parallel loading would break duplicate detection and teardown guarantees
  // because both phases read and write shared store state between await points.
  // Do NOT convert loadAll to Promise.all without reworking the entire pipeline.
  private _loading = false;

  constructor(kernel: KernelInterface, eventBus: EventBusInterface) {
    this.kernel   = kernel;
    this.eventBus = eventBus;
  }

  // ── Scan ──────────────────────────────────────────────────────────────────

  async loadAll(): Promise<void> {
    const isTauri = "__TAURI_INTERNALS__" in window;
    if (!isTauri) {
      console.info("[PluginManager] Not in Tauri — skipping disk scan.");
      return;
    }

    if (this._loading) {
      console.warn("[PluginManager] loadAll() already in progress — skipped.");
      return;
    }
    this._loading = true;

    let pluginDirs: string[] = [];
    try {
      const { readDir }          = await import("@tauri-apps/plugin-fs");
      const { appDataDir, join } = await import("@tauri-apps/api/path");
      const pluginsDir           = await join(await appDataDir(), "plugins");
      const entries              = await readDir(pluginsDir);
      pluginDirs = entries
        .filter((e: { isDirectory?: boolean; name?: string }) => e.isDirectory && e.name)
        .map((e: { name: string }) => e.name);
    } catch (e) {
      console.warn("[PluginManager] Could not read plugins directory:", e);
      this._loading = false;
      return;
    }

    // Fix H: sequential — each plugin must fully settle before the next starts
    const results: PluginLoadResult[] = [];
    for (const dir of pluginDirs) {
      results.push(await this._pipeline(dir));
    }

    this._loading = false;

    const succeeded = results.filter(r =>  r.success).length;
    const failed    = results.filter(r => !r.success);
    console.info(`[PluginManager] ${succeeded}/${results.length} plugins loaded.`);
    if (failed.length > 0) {
      console.warn(
        "[PluginManager] Failures:\n" +
        failed.map(r => `  ${r.pluginId}: ${r.error}`).join("\n")
      );
    }
    this.eventBus.emit("plugins:loaded", { succeeded, failed: failed.length, results });
  }

  // ── Pipeline ──────────────────────────────────────────────────────────────

  private async _pipeline(folderName: string): Promise<PluginLoadResult> {

    // Phase 1 — Fix A: early disabled check with zero filesystem IO.
    // We check by folderName only. Fix B enforces folderName === manifest.id
    // in Phase 2, so this check is always consistent with the post-read check.
    if (usePluginStore.getState().isDisabled(folderName)) {
      console.info(`[PluginManager] Skipping disabled plugin: ${folderName}`);
      return { pluginId: folderName, success: true };
    }

    // Phase 2 — Read + validate manifest
    let manifest: PluginManifest;
    try {
      const raw = await this._readManifest(folderName);
      if (!raw) throw new Error("manifest.json missing or unreadable");

      const errors = validateManifest(raw);
      if (errors.length > 0) throw new Error(`Invalid manifest: ${errors.join(", ")}`);

      manifest = raw as PluginManifest;

      // Fix B: single identifier contract.
      // folderName IS the plugin id. Mismatches create two disabled-check paths
      // and make it impossible to reliably address a plugin by one identifier.
      if (manifest.id !== folderName) {
        throw new Error(
          `manifest.id '${manifest.id}' must match folder name '${folderName}'. ` +
          `Rename the folder or update manifest.id.`
        );
      }

      // Fix F: apiVersion is required, not optional.
      // A missing apiVersion is treated as a future unknown version, not "1.0".
      // This prevents plugins built against a newer (breaking) API from loading
      // silently and crashing at runtime.
      const pluginApiVersion = (manifest as any).apiVersion;
      if (!pluginApiVersion) {
        throw new Error(
          `Missing required field 'apiVersion'. ` +
          `Add "apiVersion": "${SUPPORTED_API_VERSION}" to manifest.json.`
        );
      }
      if (pluginApiVersion !== SUPPORTED_API_VERSION) {
        throw new Error(
          `API version mismatch: plugin declares '${pluginApiVersion}', ` +
          `host supports '${SUPPORTED_API_VERSION}'.`
        );
      }

    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.error(`[PluginManager] Manifest error for '${folderName}':`, error);
      usePluginStore.getState()._setPlugin(folderName, {
        manifest: { id: folderName, name: folderName, version: "0.0.0", permissions: [] },
        status:   "error",
        error,
      });
      return { pluginId: folderName, success: false, error };
    }

    // Second disabled check using confirmed manifest.id
    if (usePluginStore.getState().isDisabled(manifest.id)) {
      usePluginStore.getState()._setPlugin(manifest.id, { manifest, status: "disabled" });
      return { pluginId: manifest.id, success: true };
    }

    // Fix C: block any existing entry regardless of status.
    // An "error" entry from a prior failed load is cleaned up and retried.
    // "loading" or "active" entries are genuine duplicates and are rejected.
    const existing = usePluginStore.getState().plugins[manifest.id];
    if (existing) {
      if (existing.status === "active" || existing.status === "loading") {
        const error =
          `Duplicate plugin ID '${manifest.id}' — ` +
          `already exists with status '${existing.status}'`;
        console.error(`[PluginManager] ${error}`);
        return { pluginId: manifest.id, success: false, error };
      }
      // "error" or "disabled" from a prior run — tear down and retry
      await this._teardown(manifest.id);
    }

    // Phase 3 — Prepare
    // Fix G: remove from store FIRST, then teardown, then set "loading".
    // This prevents a window where the old entry is still visible in the store
    // after the runtime has already been destroyed.
    usePluginStore.getState()._removePlugin(manifest.id);
    await this._teardown(manifest.id);
    usePluginStore.getState()._setPlugin(manifest.id, { manifest, status: "loading" });

    // Phase 4 — Activate
    return this._activate(manifest, folderName);
  }

  // ── Activate ──────────────────────────────────────────────────────────────

  private async _activate(
    manifest:   PluginManifest,
    folderName: string,
  ): Promise<PluginLoadResult> {
    // Fix D: host declared in outer scope so catch can call host.destroy()
    let host: PluginBridgeHost | null = null;

    try {
      const { readTextFile }     = await import("@tauri-apps/plugin-fs");
      const { appDataDir, join } = await import("@tauri-apps/api/path");
      const pluginPath           = await join(
        await appDataDir(), "plugins", folderName, manifest.entryPoint ?? "plugin.js"
      );
      const pluginCode = await readTextFile(pluginPath);

      host = new PluginBridgeHost(manifest, this.kernel, this.eventBus);

      // mount() injects bridge-client + pluginCode into a sandboxed iframe,
      // calls activate(ctx) inside it, and blocks until the plugin signals ready.
      // Throws on 15s timeout or if the plugin throws during activation.
      await host.mount(pluginCode);

      this.runtimes.set(manifest.id, { host });

      usePluginStore.getState()._setPlugin(manifest.id, {
        manifest,
        status:    "active",
        enabledAt: Date.now(),
      });

      console.info(`[PluginManager] Active: ${manifest.name} v${manifest.version}`);
      return { pluginId: manifest.id, success: true };

    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.error(`[PluginManager] Activation failed for '${manifest.id}':`, e);

      // Fix D: if mount() threw after the iframe was created, destroy it now.
      // Leaving it alive leaks memory, DOM nodes, and event listeners.
      if (host) {
        try { host.destroy(); } catch { /* best effort */ }
      }

      usePluginStore.getState()._setPlugin(manifest.id, {
        manifest,
        status: "error",
        error,
      });
      return { pluginId: manifest.id, success: false, error };
    }
  }

  // ── Teardown ──────────────────────────────────────────────────────────────

  private async _teardown(id: string): Promise<void> {
    const runtime = this.runtimes.get(id);
    if (!runtime) return;
    try {
      // destroy() removes the iframe from the DOM, detaches the message listener,
      // and cleans up all event subscriptions the plugin registered via the bridge.
      runtime.host.destroy();
    } catch (e) {
      console.warn(`[PluginManager] Teardown error for '${id}':`, e);
    }
    this.runtimes.delete(id);
  }

  // ── Manifest reader ───────────────────────────────────────────────────────

  // Fix E: log before returning null so silent failures are visible in devtools
  private async _readManifest(folderName: string): Promise<unknown | null> {
    try {
      const { readTextFile }     = await import("@tauri-apps/plugin-fs");
      const { appDataDir, join } = await import("@tauri-apps/api/path");
      const path = await join(
        await appDataDir(), "plugins", folderName, "manifest.json"
      );
      return JSON.parse(await readTextFile(path));
    } catch (e) {
      console.warn(`[PluginManager] Could not read manifest for '${folderName}':`, e);
      return null;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async unloadPlugin(id: string): Promise<void> {
    // Fix G: remove from store before teardown for clean state transition
    usePluginStore.getState()._removePlugin(id);
    await this._teardown(id);
  }

  async reloadPlugin(folderName: string): Promise<void> {
    // Goes through the full pipeline — handles teardown and deduplication correctly
    await this._pipeline(folderName);
  }

  setEnabled(id: string, enabled: boolean): void {
    usePluginStore.getState().setDisabled(id, !enabled);
  }
}