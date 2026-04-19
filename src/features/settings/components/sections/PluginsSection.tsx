import { useState, useEffect, useRef } from "react";
import {
  Puzzle, FolderOpen, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Loader, ChevronDown, ChevronRight,
  Upload,
} from "lucide-react";
import { clsx } from "clsx";
import { usePluginStore, PERMISSION_LABELS, SENSITIVE_PERMISSIONS } from "@/core";
import type { LoadedPlugin } from "@/core";
import { SectionHeader, SettingGroup, SettingRow, Toggle } from "./shared";
import { isTauri } from "@/bridge";

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LoadedPlugin["status"] }) {
  const config = {
    active:   { icon: CheckCircle,   color: "text-success", bg: "bg-success/10", label: "active"   },
    loading:  { icon: Loader,        color: "text-amber",   bg: "bg-amber/10",   label: "loading"  },
    disabled: { icon: XCircle,       color: "text-subtle",  bg: "bg-subtle/10",  label: "disabled" },
    error:    { icon: AlertTriangle, color: "text-danger",  bg: "bg-danger/10",  label: "error"    },
  }[status];
  const Icon = config.icon;
  return (
    <span className={clsx("flex items-center gap-1 text-2xs font-mono px-2 py-0.5 rounded-full", config.color, config.bg)}>
      <Icon size={9} />
      {config.label}
    </span>
  );
}

// ── Plugin card ───────────────────────────────────────────────────────────────

function PluginCard({ plugin }: { plugin: LoadedPlugin }) {
  const { setDisabled, isDisabled } = usePluginStore();
  const [expanded, setExpanded] = useState(false);
  const { manifest } = plugin;
  const disabled = isDisabled(manifest.id);
  const sensitivePerms = manifest.permissions.filter((p) => SENSITIVE_PERMISSIONS.has(p));

  return (
    <div className="border-b border-border last:border-0">
      <div className="px-4 py-3 bg-raised/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber/10 border border-amber/20">
              <Puzzle size={14} className="text-amber" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-sans font-medium text-ink">{manifest.name}</p>
                <StatusBadge status={plugin.status} />
              </div>
              <p className="text-2xs font-mono text-subtle mt-0.5">
                {manifest.id} · v{manifest.version}
                {manifest.author && ` · ${manifest.author}`}
              </p>
            </div>
          </div>
          <Toggle
            value={!disabled}
            onChange={(v) => setDisabled(manifest.id, !v)}
            disabled={plugin.status === "loading"}
          />
        </div>

        {manifest.description && (
          <p className="text-2xs font-sans text-muted mt-2 leading-relaxed">
            {manifest.description}
          </p>
        )}

        {plugin.status === "error" && plugin.error && (
          <div className="mt-2 px-2 py-1.5 bg-danger/10 border border-danger/20 rounded text-2xs font-mono text-danger">
            {plugin.error}
          </div>
        )}

        {manifest.permissions.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 mt-2 text-2xs font-mono text-subtle hover:text-ink transition-colors"
          >
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            {manifest.permissions.length} permission{manifest.permissions.length !== 1 ? "s" : ""}
            {sensitivePerms.length > 0 && (
              <span className="ml-1 text-amber">· {sensitivePerms.length} sensitive</span>
            )}
          </button>
        )}

        {expanded && (
          <div className="mt-2 space-y-1">
            {manifest.permissions.map((perm) => (
              <div key={perm} className="flex items-center gap-2">
                {SENSITIVE_PERMISSIONS.has(perm)
                  ? <AlertTriangle size={9} className="text-amber shrink-0" />
                  : <CheckCircle   size={9} className="text-subtle shrink-0" />
                }
                <span className="text-2xs font-sans text-muted">
                  {PERMISSION_LABELS[perm] ?? perm}
                </span>
                <span className="text-2xs font-mono text-subtle/60 ml-auto">{perm}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Plugin drop zone ──────────────────────────────────────────────────────────

async function installPluginFromPath(sourcePath: string): Promise<string> {
  const { appDataDir, join, basename } = await import("@tauri-apps/api/path");
  const { mkdir, copyFile }            = await import("@tauri-apps/plugin-fs");

  const folderName = await basename(sourcePath);
  const destDir    = await join(await appDataDir(), "plugins", folderName);
  await mkdir(destDir, { recursive: true });

  for (const file of ["manifest.json", "plugin.js"]) {
    try {
      await copyFile(
        await join(sourcePath, file),
        await join(destDir,   file)
      );
    } catch { /* file may not exist */ }
  }

  return folderName;
}

function PluginDropZone({ onInstalled }: { onInstalled: () => void }) {
  const [dragging,   setDragging]   = useState(false);
  const [installing, setInstalling] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const unlistenRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!isTauri) return;

    import("@tauri-apps/api/event").then(({ listen }) => {
      // Drop — install the plugin
      listen("tauri://drag-drop", async (event: any) => {
        const paths: string[] = event.payload?.paths ?? [];
        if (paths.length === 0) return;
        setInstalling(true);
        setDragging(false);
        try {
          for (const p of paths) {
            const name = await installPluginFromPath(p);
            setLastResult(`"${name}" installed — click Reload to activate`);
          }
          onInstalled();
        } catch (e) {
          setLastResult(`Install failed: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
          setInstalling(false);
        }
      }).then((u) => unlistenRef.current.push(u));

      // Hover enter/leave for visual feedback
      listen("tauri://drag-enter", () => setDragging(true))
        .then((u) => unlistenRef.current.push(u));
      listen("tauri://drag-leave", () => setDragging(false))
        .then((u) => unlistenRef.current.push(u));
    });

    return () => {
      unlistenRef.current.forEach((u) => u());
      unlistenRef.current = [];
    };
  }, [onInstalled]);

  if (!isTauri) return null;

  return (
    <div className="mb-6">
      <div className={clsx(
        "rounded-lg border-2 border-dashed px-4 py-5 text-center transition-all duration-150",
        dragging
          ? "border-amber bg-amber/5 scale-[1.01]"
          : "border-border hover:border-muted/40"
      )}>
        {installing ? (
          <div className="flex items-center justify-center gap-2">
            <Loader size={14} className="text-amber animate-spin" />
            <p className="text-xs font-mono text-amber">Installing…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <Upload
              size={16}
              strokeWidth={1.5}
              className={dragging ? "text-amber" : "text-subtle"}
            />
            <p className="text-xs font-sans text-subtle">
              {dragging
                ? "Drop to install plugin"
                : "Drag a plugin folder here to install"}
            </p>
          </div>
        )}
      </div>
      {lastResult && (
        <p className="text-2xs font-mono text-muted mt-1.5 px-1">{lastResult}</p>
      )}
    </div>
  );
}

// ── Plugins Section ───────────────────────────────────────────────────────────

export function PluginsSection() {
  const { plugins } = usePluginStore();
  const pluginList  = Object.values(plugins);
  const [reloading, setReloading] = useState(false);

  const openPluginsFolder = async () => {
    if (!isTauri) return;
    try {
      const { appDataDir, join } = await import("@tauri-apps/api/path");
      const { mkdir }            = await import("@tauri-apps/plugin-fs");
      const { Command }          = await import("@tauri-apps/plugin-shell");

      const pluginsPath = await join(await appDataDir(), "plugins");
      try { await mkdir(pluginsPath, { recursive: true }); } catch { /* exists */ }

      const isMac     = navigator.userAgent.includes("Mac");
      const isWindows = navigator.userAgent.includes("Win");

      if (isMac) {
        await Command.create("open-folder", [pluginsPath]).execute();
      } else if (isWindows) {
        await Command.create("open-folder-win", [pluginsPath]).execute();
      } else {
        await Command.create("open-folder-linux", [pluginsPath]).execute();
      }
    } catch (e) {
      console.error("openPluginsFolder failed:", e);
      try {
        const { appDataDir, join } = await import("@tauri-apps/api/path");
        const path = await join(await appDataDir(), "plugins");
        alert(`Open this folder manually:\n${path}`);
      } catch { alert("Could not determine plugins folder path."); }
    }
  };

  const reloadPlugins = async () => {
    setReloading(true);
    window.dispatchEvent(new CustomEvent("noter:reload-plugins"));
    setTimeout(() => setReloading(false), 800);
  };

  return (
    <div>
      <SectionHeader
        title="Plugins"
        description="Extend noter with community and custom plugins."
      />

      <SettingGroup title="Plugin Directory">
        <SettingRow
          label="Plugins folder"
          description="Open the plugins directory in your file manager."
        >
          <button
            onClick={openPluginsFolder}
            disabled={!isTauri}
            className="flex items-center gap-1.5 text-xs font-mono text-amber
                       hover:text-amber-glow transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FolderOpen size={11} />
            Open folder
          </button>
        </SettingRow>
        <SettingRow
          label="Reload plugins"
          description="Scan the plugins folder and load any new plugins."
        >
          <button
            onClick={reloadPlugins}
            className="flex items-center gap-1.5 text-xs font-mono text-subtle hover:text-ink transition-colors"
          >
            <RefreshCw size={11} className={reloading ? "animate-spin" : ""} />
            Reload
          </button>
        </SettingRow>
      </SettingGroup>

      {/* Drop zone */}
      <PluginDropZone onInstalled={reloadPlugins} />

      {/* Installed list */}
      <div className="mb-6">
        <p className="text-2xs font-mono uppercase tracking-widest text-subtle mb-2">
          Installed ({pluginList.length})
        </p>
        <div className="rounded-lg border border-border overflow-hidden">
          {pluginList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Puzzle size={28} className="text-subtle/30" strokeWidth={1.5} />
              <p className="text-xs font-sans text-subtle text-center max-w-xs leading-relaxed">
                No plugins installed yet. Drag a plugin folder into the drop zone above.
              </p>
              <button
                onClick={openPluginsFolder}
                disabled={!isTauri}
                className="text-xs font-mono text-amber hover:text-amber-glow transition-colors disabled:opacity-40"
              >
                Open plugins folder →
              </button>
            </div>
          ) : (
            pluginList.map((plugin) => (
              <PluginCard key={plugin.manifest.id} plugin={plugin} />
            ))
          )}
        </div>
      </div>

      <SettingGroup title="How to install a plugin">
        <SettingRow
          label="1. Get a plugin"
          description="Download a noter plugin folder from GitHub or the community."
        />
        <SettingRow
          label="2. Drop it in"
          description="Drag the plugin folder onto the drop zone above. It must contain manifest.json and plugin.js."
        />
        <SettingRow
          label="3. Reload"
          description='Click "Reload" above. The plugin will appear in this list.'
        />
      </SettingGroup>

      <div className="text-2xs font-sans text-subtle leading-relaxed px-1">
        Enabling or disabling a plugin takes effect on the next app launch.
      </div>
    </div>
  );
}