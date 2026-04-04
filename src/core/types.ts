// ─────────────────────────────────────────────────────────────────────────────
// Core Types
// All shared types for the kernel, feature system, and event bus.
// ─────────────────────────────────────────────────────────────────────────────

// ── Feature Lifecycle ─────────────────────────────────────────────────────────

export type FeatureStatus =
  | "registered"   // Added to kernel registry but not yet initialized
  | "initializing" // Currently running onInit
  | "running"      // Fully active
  | "stopping"     // Currently running onStop
  | "stopped"      // Stopped, can be restarted
  | "disabled"     // Explicitly disabled for this session
  | "error";       // Lifecycle hook threw an error

export interface FeatureEntry<Config = unknown> {
  definition: FeatureDefinition<Config>;
  status: FeatureStatus;
  error?: Error;
  startedAt?: number;
  stoppedAt?: number;
}

// ── Feature Definition ────────────────────────────────────────────────────────
// Each feature module exports a FeatureDefinition. This is the contract between
// a feature and the kernel — no other coupling is needed.

export interface FeatureDefinition<Config = unknown> {
  /** Unique identifier. Use kebab-case, e.g. "tabs", "note-editor". */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Semver string for the feature. */
  version: string;
  /** Optional description shown in the kernel debugger. */
  description?: string;
  /**
   * IDs of features that must be running before this feature can start.
   * The kernel will auto-start dependencies in order.
   */
  dependencies?: string[];
  /** Static configuration — injected into the feature context. */
  config?: Config;

  // ── Lifecycle hooks ────────────────────────────────────────────────────────
  /** Called once, ever. Set up stores, validate config, register commands. */
  onInit?:    (ctx: FeatureContext<Config>) => Promise<void>;
  /** Called on every start (including after restart). Subscribe to events. */
  onStart?:   (ctx: FeatureContext<Config>) => Promise<void>;
  /** Called on stop. Unsubscribe from events, flush buffers. */
  onStop?:    (ctx: FeatureContext<Config>) => Promise<void>;
  /** Called before re-init during a restart. Defaults to stop→start. */
  onRestart?: (ctx: FeatureContext<Config>) => Promise<void>;
  /** Called when feature is permanently disabled this session. */
  onDisable?: (ctx: FeatureContext<Config>) => Promise<void>;
  /** Called when any lifecycle hook throws. Allows graceful degradation. */
  onError?:   (ctx: FeatureContext<Config>, error: Error) => Promise<void>;
}

// ── Feature Context ────────────────────────────────────────────────────────────
// Injected into every lifecycle hook. Gives features access to kernel services
// without importing the kernel directly (avoids circular dependencies).

export interface FeatureContext<Config = unknown> {
  /** The kernel itself — for starting/stopping sibling features. */
  readonly kernel: KernelInterface;
  /** Typed event bus for publishing and subscribing. */
  readonly events: EventBusInterface;
  /** The feature's own config, merged with kernel defaults. */
  readonly config: Config;
  /** Scoped logger that prefixes all messages with the feature id. */
  readonly logger: FeatureLogger;
}

// ── Kernel Interface ──────────────────────────────────────────────────────────
// The kernel exposes this interface to features — only what they need.

export interface KernelInterface {
  register<C>(feature: FeatureDefinition<C>): void;
  getStatus(id: string): FeatureStatus | "unknown";
  getFeature<C = unknown>(id: string): FeatureDefinition<C> | undefined;
  getAllEntries(): FeatureEntry[];
  start(id: string): Promise<void>;
  stop(id: string): Promise<void>;
  restart(id: string): Promise<void>;
  disable(id: string): Promise<void>;
  readonly events: EventBusInterface;
}

// ── Event Bus ─────────────────────────────────────────────────────────────────

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;
export type Unsubscribe = () => void;

export interface EventBusInterface {
  on<T = unknown>(event: string, handler: EventHandler<T>): Unsubscribe;
  once<T = unknown>(event: string, handler: EventHandler<T>): Unsubscribe;
  off(event: string, handler: EventHandler): void;
  emit<T = unknown>(event: string, payload?: T): void;
}

// ── Logger ────────────────────────────────────────────────────────────────────

export interface FeatureLogger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

// ── Well-known kernel events ──────────────────────────────────────────────────
// Features can listen to these to react to lifecycle changes of others.

export const KernelEvents = {
  FEATURE_REGISTERED:   "kernel:feature:registered",
  FEATURE_INITIALIZED:  "kernel:feature:initialized",
  FEATURE_STARTED:      "kernel:feature:started",
  FEATURE_STOPPED:      "kernel:feature:stopped",
  FEATURE_RESTARTED:    "kernel:feature:restarted",
  FEATURE_DISABLED:     "kernel:feature:disabled",
  FEATURE_ERROR:        "kernel:feature:error",
  KERNEL_READY:         "kernel:ready",
} as const;

export type KernelEventName = (typeof KernelEvents)[keyof typeof KernelEvents];

export interface KernelFeatureEvent {
  featureId: string;
  status: FeatureStatus;
  error?: Error;
}
