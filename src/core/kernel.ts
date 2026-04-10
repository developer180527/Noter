// ─────────────────────────────────────────────────────────────────────────────
// Kernel
// The central service container and feature lifecycle manager.
//
// Lifecycle: registered → initializing → running → stopping → stopped
//                                                 ↳ disabled
//                                                 ↳ error
//
// Usage:
//   const kernel = Kernel.getInstance();
//   kernel.register(tabsFeature);
//   kernel.register(notesFeature);
//   await kernel.bootAll();
// ─────────────────────────────────────────────────────────────────────────────

import { EventBus } from "./event-bus";
import { SlotRegistry } from "./slot-registry";
import {
  type FeatureDefinition,
  type FeatureEntry,
  type FeatureStatus,
  type FeatureContext,
  type FeatureLogger,
  type KernelInterface,
  KernelEvents,
} from "./types";

// ── Internal logger factory ───────────────────────────────────────────────────

function makeLogger(featureId: string): FeatureLogger {
  const prefix = `[${featureId}]`;
  return {
    info:  (msg, ...args) => console.info( `%c${prefix}`, "color:#d4903a", msg, ...args),
    warn:  (msg, ...args) => console.warn( `%c${prefix}`, "color:#d4903a", msg, ...args),
    error: (msg, ...args) => console.error(`%c${prefix}`, "color:#c0392b", msg, ...args),
    debug: (msg, ...args) => console.debug(`%c${prefix}`, "color:#7a7370", msg, ...args),
  };
}

// ── Kernel ────────────────────────────────────────────────────────────────────

export class Kernel implements KernelInterface {
  // Singleton
  private static _instance: Kernel | null = null;
  static getInstance(): Kernel {
    if (!Kernel._instance) Kernel._instance = new Kernel();
    return Kernel._instance;
  }
  /** For tests only — resets the singleton. */
  static _resetForTest(): void {
    Kernel._instance = null;
  }

  readonly events = new EventBus();
  readonly slots  = new SlotRegistry();

  private readonly registry = new Map<string, FeatureEntry<unknown>>();
  /** Tracks which features have completed onInit (runs once). */
  private readonly initialized = new Set<string>();

  private constructor() {
    this.slots._setEventBus(this.events);
  }

  // ── Registration ──────────────────────────────────────────────────────────

  register<C>(feature: FeatureDefinition<C>): void {
    if (this.registry.has(feature.id)) {
      console.warn(`[Kernel] Feature "${feature.id}" is already registered. Skipping.`);
      return;
    }
    this.registry.set(feature.id, {
      definition: feature as FeatureDefinition<unknown>,
      status: "registered",
    });
    this.events.emit(KernelEvents.FEATURE_REGISTERED, { featureId: feature.id, status: "registered" });
    console.info(`%c[Kernel]%c Registered feature: ${feature.id} v${feature.version}`, "color:#d4903a", "color:inherit");
  }

  unregister(id: string): void {
    const entry = this.registry.get(id);
    if (!entry) return;
    if (entry.status === "running") {
      console.warn(`[Kernel] Attempted to unregister running feature "${id}". Stop it first.`);
      return;
    }
    this.registry.delete(id);
    this.initialized.delete(id);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  /**
   * Initialize and start all registered features in dependency order.
   * Call this once at app startup.
   */
  async bootAll(): Promise<void> {
    const order = this.resolveOrder();
    console.info(`%c[Kernel]%c Booting ${order.length} features: ${order.join(" → ")}`, "color:#d4903a", "color:inherit");

    for (const id of order) {
      await this.init(id);
      await this.start(id);
    }

    this.events.emit(KernelEvents.KERNEL_READY, { timestamp: Date.now() });
    console.info("%c[Kernel]%c All features running ✓", "color:#d4903a;font-weight:bold", "color:inherit");
  }

  // ── Lifecycle: init ───────────────────────────────────────────────────────

  async init(id: string): Promise<void> {
    const entry = this.getEntry(id);
    if (!entry) return;
    if (this.initialized.has(id)) return; // onInit is idempotent
    if (entry.status === "disabled") return;

    this.setStatus(id, "initializing");
    const ctx = this.makeContext(entry);

    try {
      await entry.definition.onInit?.(ctx);
      this.initialized.add(id);
      this.events.emit(KernelEvents.FEATURE_INITIALIZED, { featureId: id, status: "initializing" });
    } catch (err) {
      await this.handleError(id, entry, err as Error, ctx);
    }
  }

  // ── Lifecycle: start ──────────────────────────────────────────────────────

  async start(id: string): Promise<void> {
    const entry = this.getEntry(id);
    if (!entry) return;
    if (entry.status === "running") return;
    if (entry.status === "disabled" || entry.status === "error") return;

    // Ensure dependencies are running first
    for (const depId of entry.definition.dependencies ?? []) {
      const depEntry = this.getEntry(depId);
      if (!depEntry) {
        console.error(`[Kernel] Missing dependency "${depId}" for feature "${id}"`);
        return;
      }
      if (depEntry.status !== "running") {
        await this.init(depId);
        await this.start(depId);
      }
    }

    const ctx = this.makeContext(entry);
    try {
      await entry.definition.onStart?.(ctx);
      this.setStatus(id, "running");
      entry.startedAt = Date.now();
      this.events.emit(KernelEvents.FEATURE_STARTED, { featureId: id, status: "running" });
    } catch (err) {
      await this.handleError(id, entry, err as Error, ctx);
    }
  }

  // ── Lifecycle: stop ───────────────────────────────────────────────────────

  async stop(id: string): Promise<void> {
    const entry = this.getEntry(id);
    if (!entry || entry.status !== "running") return;

    this.setStatus(id, "stopping");
    const ctx = this.makeContext(entry);

    try {
      await entry.definition.onStop?.(ctx);
      this.setStatus(id, "stopped");
      entry.stoppedAt = Date.now();
      this.events.emit(KernelEvents.FEATURE_STOPPED, { featureId: id, status: "stopped" });
    } catch (err) {
      await this.handleError(id, entry, err as Error, ctx);
    }
  }

  // ── Lifecycle: restart ────────────────────────────────────────────────────

  async restart(id: string): Promise<void> {
    const entry = this.getEntry(id);
    if (!entry) return;

    const ctx = this.makeContext(entry);

    if (entry.definition.onRestart) {
      try {
        await entry.definition.onRestart(ctx);
        this.setStatus(id, "running");
        this.events.emit(KernelEvents.FEATURE_RESTARTED, { featureId: id, status: "running" });
        return;
      } catch (err) {
        await this.handleError(id, entry, err as Error, ctx);
        return;
      }
    }

    // Default: stop → start
    await this.stop(id);
    await this.start(id);
    this.events.emit(KernelEvents.FEATURE_RESTARTED, { featureId: id, status: "running" });
  }

  // ── Lifecycle: disable ────────────────────────────────────────────────────

  async disable(id: string): Promise<void> {
    const entry = this.getEntry(id);
    if (!entry) return;

    if (entry.status === "running") {
      await this.stop(id);
    }

    const ctx = this.makeContext(entry);
    await entry.definition.onDisable?.(ctx);
    this.setStatus(id, "disabled");
    this.events.emit(KernelEvents.FEATURE_DISABLED, { featureId: id, status: "disabled" });
  }

  // ── Introspection ─────────────────────────────────────────────────────────

  getStatus(id: string): FeatureStatus | "unknown" {
    return this.registry.get(id)?.status ?? "unknown";
  }

  getFeature<C = unknown>(id: string): FeatureDefinition<C> | undefined {
    return this.registry.get(id)?.definition as FeatureDefinition<C> | undefined;
  }

  getAllEntries(): FeatureEntry[] {
    return [...this.registry.values()];
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private getEntry(id: string): FeatureEntry<unknown> | undefined {
    const entry = this.registry.get(id);
    if (!entry) {
      console.warn(`[Kernel] Unknown feature: "${id}"`);
    }
    return entry;
  }

  private setStatus(id: string, status: FeatureStatus): void {
    const entry = this.registry.get(id);
    if (entry) entry.status = status;
  }

  private makeContext<C>(entry: FeatureEntry<C>): FeatureContext<C> {
    return {
      kernel: this,
      events: this.events,
      config: (entry.definition.config ?? {}) as C,
      logger: makeLogger(entry.definition.id),
      slots:  this.slots,
    };
  }

  private async handleError(
    id: string,
    entry: FeatureEntry<unknown>,
    err: Error,
    ctx: FeatureContext<unknown>
  ): Promise<void> {
    console.error(`[Kernel] Feature "${id}" lifecycle error:`, err);
    entry.error = err;
    this.setStatus(id, "error");
    this.events.emit(KernelEvents.FEATURE_ERROR, { featureId: id, status: "error", error: err });

    // Give the feature a chance to degrade gracefully
    try {
      await entry.definition.onError?.(ctx, err);
    } catch (innerErr) {
      console.error(`[Kernel] onError for "${id}" also threw:`, innerErr);
    }
  }

  /**
   * Topological sort of registered features by dependencies.
   * Throws on circular dependencies.
   */
  private resolveOrder(): string[] {
    const visited  = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`[Kernel] Circular dependency detected involving feature "${id}"`);
      }
      visiting.add(id);
      const entry = this.registry.get(id);
      for (const dep of entry?.definition.dependencies ?? []) {
        if (this.registry.has(dep)) visit(dep);
      }
      visiting.delete(id);
      visited.add(id);
      result.push(id);
    };

    for (const id of this.registry.keys()) visit(id);
    return result;
  }
}