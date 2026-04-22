// ── Plugin system barrel ──────────────────────────────────────────────────────
export type { PluginPermission }                    from "./permissions";
export { PERMISSION_LABELS, SENSITIVE_PERMISSIONS } from "./permissions";
export type { PluginManifest }                      from "./manifest";
export { validateManifest }                         from "./manifest";
export type { LoadedPlugin, PluginStatus }          from "./manager";
export { PluginManager, usePluginStore }            from "./manager";
export { PluginBridgeHost }                         from "./bridge-host";
export { BRIDGE_CLIENT_CODE }                       from "./bridge-client";
export type {
  PluginCtx,
  BridgeNotesReadAPI,
  BridgeNotesWriteAPI,
  BridgeCanvasReadAPI,
  BridgeCanvasWriteAPI,
  BridgeStorageAPI,
  BridgeUIAPI,
  BridgeEventsAPI,
}                                                   from "./bridge-client";