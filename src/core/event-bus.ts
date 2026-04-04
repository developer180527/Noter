// ─────────────────────────────────────────────────────────────────────────────
// EventBus
// A simple, typed publish-subscribe event bus.
// Features communicate through events — never via direct imports of each other.
// ─────────────────────────────────────────────────────────────────────────────

import type { EventBusInterface, EventHandler, Unsubscribe } from "./types";

export class EventBus implements EventBusInterface {
  private readonly listeners = new Map<string, Set<EventHandler<unknown>>>();

  // ── Subscribe ──────────────────────────────────────────────────────────────

  on<T = unknown>(event: string, handler: EventHandler<T>): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const h = handler as EventHandler<unknown>;
    this.listeners.get(event)!.add(h);
    return () => this.off(event, h);
  }

  once<T = unknown>(event: string, handler: EventHandler<T>): Unsubscribe {
    const wrapper: EventHandler<T> = (payload) => {
      unsub();
      return handler(payload);
    };
    const unsub = this.on(event, wrapper);
    return unsub;
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler as EventHandler<unknown>);
  }

  // ── Publish ────────────────────────────────────────────────────────────────

  emit<T = unknown>(event: string, payload?: T): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    // Copy so that handlers that unsubscribe during iteration don't cause issues
    for (const handler of [...handlers]) {
      try {
        const result = handler(payload as unknown);
        if (result instanceof Promise) {
          // Fire-and-forget async handlers — log unhandled rejections
          result.catch((err) =>
            console.error(`[EventBus] Async handler for "${event}" threw:`, err)
          );
        }
      } catch (err) {
        console.error(`[EventBus] Handler for "${event}" threw:`, err);
      }
    }
  }

  // ── Debug ─────────────────────────────────────────────────────────────────

  /** Returns all currently registered event names. Useful for the kernel debugger. */
  registeredEvents(): string[] {
    return [...this.listeners.keys()];
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
