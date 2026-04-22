export { Kernel }          from "./kernel";
export { EventBus }        from "./event-bus";
export { SlotRegistry }    from "./slot-registry";
export { KernelProvider, useKernel, useFeatureStatus, useKernelReady } from "./kernel.context";
export { KernelEvents }    from "./types";
export type {
  FeatureDefinition,
  FeatureContext,
  FeatureEntry,
  FeatureStatus,
  FeatureLogger,
  KernelInterface,
  EventBusInterface,
  EventHandler,
  Unsubscribe,
  KernelFeatureEvent,
  SlotRegistry as SlotRegistryInterface,
} from "./types";

// ── Plugin system ─────────────────────────────────────────────────────────────
export {
  PERMISSION_LABELS,
  SENSITIVE_PERMISSIONS,
  validateManifest,
  PluginManager,
  usePluginStore,
  PluginBridgeHost,
  BRIDGE_CLIENT_CODE,
} from "./plugin";
export type {
  PluginPermission,
  PluginManifest,
  LoadedPlugin,
  PluginStatus,
  PluginCtx,
  BridgeNotesReadAPI,
  BridgeNotesWriteAPI,
  BridgeCanvasReadAPI,
  BridgeCanvasWriteAPI,
  BridgeStorageAPI,
  BridgeUIAPI,
  BridgeEventsAPI,
} from "./plugin";