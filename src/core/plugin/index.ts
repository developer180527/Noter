// ── Plugin system barrel ──────────────────────────────────────────────────────
export type { PluginPermission }                  from "./permissions";
export { PERMISSION_LABELS, SENSITIVE_PERMISSIONS } from "./permissions";
export type { PluginManifest }                    from "./manifest";
export { validateManifest }                       from "./manifest";
export type {
  PluginContext,
  PluginNotesReadAPI,
  PluginNotesWriteAPI,
  PluginCanvasReadAPI,
  PluginCanvasWriteAPI,
  PluginStorageAPI,
  PluginUIAPI,
  PluginKeyboardAPI,
  PluginEventsAPI,
}                                                 from "./context";
export { buildPluginContext }                     from "./context";
export type { LoadedPlugin, PluginStatus }        from "./manager";
export { PluginManager, usePluginStore }          from "./manager";