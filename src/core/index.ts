export { Kernel } from "./kernel";
export { EventBus } from "./event-bus";
export { SlotRegistry } from "./slot-registry";
export { KernelProvider, useKernel, useFeatureStatus, useKernelReady } from "./kernel.context";
export { KernelEvents } from "./types";
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
  buildPluginContext,
  PluginManager,
  usePluginStore,
} from "./plugin";
export type {
  PluginPermission,
  PluginManifest,
  PluginContext,
  PluginNotesReadAPI,
  PluginNotesWriteAPI,
  PluginCanvasReadAPI,
  PluginCanvasWriteAPI,
  PluginStorageAPI,
  PluginUIAPI,
  PluginKeyboardAPI,
  PluginEventsAPI,
  LoadedPlugin,
  PluginStatus,
} from "./plugin";