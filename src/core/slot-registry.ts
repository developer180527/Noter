import { type ComponentType } from "react";
import type { SlotRegistry as ISlotRegistry } from "./types";

export class SlotRegistry implements ISlotRegistry {
  private readonly slots     = new Map<string, ComponentType<any>>();
  private readonly listeners = new Set<() => void>();
  private snapshotVersion    = 0;
  private eventBus?: { emit: (event: string) => void };

  _setEventBus(bus: { emit: (event: string) => void }) {
    this.eventBus = bus;
  }

  private notify() {
    this.snapshotVersion++;
    this.listeners.forEach((l) => l());
    this.eventBus?.emit("kernel:slot:registered");
  }

  register(slot: string, component: ComponentType<any>): void {
    this.slots.set(slot, component);
    this.notify();
  }

  unregister(slot: string): void {
    this.slots.delete(slot);
    this.notify();
  }

  get(slot: string): ComponentType<any> | undefined {
    return this.slots.get(slot);
  }

  has(slot: string): boolean {
    return this.slots.has(slot);
  }

  // ── useSyncExternalStore API ──────────────────────────────────────────────
  // Allows React to subscribe to slot changes and re-render synchronously.
  // Bound methods so they can be passed directly to useSyncExternalStore().

  subscribe = (callback: () => void): (() => void) => {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  };

  getSnapshot = (): number => {
    return this.snapshotVersion;
  };
}