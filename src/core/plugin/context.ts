import type { ComponentType } from "react";
import type { PluginManifest } from "./manifest";
import type { KernelInterface, EventBusInterface, Unsubscribe } from "../types";

// ── Sub-APIs ──────────────────────────────────────────────────────────────────

export interface PluginNotesReadAPI {
  list(): Promise<Array<{ id: string; title: string; tags: string[]; updatedAt: number }>>;
  read(id: string): Promise<{ id: string; title: string; body: string; tags: string[] } | null>;
}
export interface PluginNotesWriteAPI {
  create(data: { title?: string; body?: string; tags?: string[] }): Promise<string>;
  update(id: string, patch: { title?: string; body?: string; tags?: string[] }): Promise<void>;
  delete(id: string): Promise<void>;
}
export interface PluginCanvasReadAPI {
  list(): Promise<Array<{ id: string; title: string; updatedAt: number }>>;
}
export interface PluginCanvasWriteAPI {
  create(title?: string): Promise<string>;
  rename(id: string, title: string): Promise<void>;
  delete(id: string): Promise<void>;
}
export interface PluginStorageAPI {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}
export interface PluginUIAPI {
  registerPage(componentKey: string, component: ComponentType<unknown>): void;
  registerSidebarItem(item: {
    id: string; label: string; icon: string;
    componentKey: string; isPanelItem?: boolean;
  }): void;
  registerToolbarItem(component: ComponentType<unknown>): void;
  showToast(message: string, type?: "info" | "success" | "error"): void;
  openTab(opts: { id: string; title: string; componentKey: string }): void;
}
export interface PluginKeyboardAPI {
  register(shortcut: string, handler: () => void): Unsubscribe;
}
export interface PluginEventsAPI {
  emit(event: string, payload?: unknown): void;
  on(event: string, handler: (payload: unknown) => void): Unsubscribe;
}

// ── Mutable context shape for building ───────────────────────────────────────

interface MutablePluginContext {
  manifest:      PluginManifest;
  notes?:        PluginNotesReadAPI;
  notesWrite?:   PluginNotesWriteAPI;
  canvas?:       PluginCanvasReadAPI;
  canvasWrite?:  PluginCanvasWriteAPI;
  storage?:      PluginStorageAPI;
  ui?:           PluginUIAPI;
  keyboard?:     PluginKeyboardAPI;
  events?:       PluginEventsAPI;
}

// ── Public readonly type ──────────────────────────────────────────────────────

export type PluginContext = Readonly<MutablePluginContext>;

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildPluginContext(
  manifest: PluginManifest,
  kernel:   KernelInterface,
  eventBus: EventBusInterface,
): PluginContext {
  const perms = new Set(manifest.permissions);
  const ctx: MutablePluginContext = { manifest };

  if (perms.has("notes:read")) {
    ctx.notes = {
      async list() {
        const { useNoteStore } = await import("@/features/notes/note.store");
        return useNoteStore.getState().notes
          .filter((n) => !n.archived)
          .map(({ id, title, tags, updatedAt }) => ({ id, title, tags, updatedAt }));
      },
      async read(id) {
        const { useNoteStore } = await import("@/features/notes/note.store");
        const note = useNoteStore.getState().notes.find((n) => n.id === id);
        if (!note) return null;
        return { id: note.id, title: note.title, body: note.body, tags: note.tags };
      },
    };
  }

  if (perms.has("notes:write")) {
    ctx.notesWrite = {
      async create(data) {
        const { useNoteStore } = await import("@/features/notes/note.store");
        return useNoteStore.getState().createNote(data);
      },
      async update(id, patch) {
        const { useNoteStore } = await import("@/features/notes/note.store");
        useNoteStore.getState().updateNote(id, patch);
      },
      async delete(id) {
        const { useNoteStore } = await import("@/features/notes/note.store");
        useNoteStore.getState().deleteNote(id);
      },
    };
  }

  if (perms.has("canvas:read")) {
    ctx.canvas = {
      async list() {
        const { useCanvasStore } = await import("@/features/canvas/canvas.store");
        return useCanvasStore.getState().drawings
          .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }));
      },
    };
  }

  if (perms.has("canvas:write")) {
    ctx.canvasWrite = {
      async create(title) {
        const { useCanvasStore } = await import("@/features/canvas/canvas.store");
        return useCanvasStore.getState().createDrawing(title);
      },
      async rename(id, title) {
        const { useCanvasStore } = await import("@/features/canvas/canvas.store");
        useCanvasStore.getState().renameDrawing(id, title);
      },
      async delete(id) {
        const { useCanvasStore } = await import("@/features/canvas/canvas.store");
        useCanvasStore.getState().deleteDrawing(id);
      },
    };
  }

  if (perms.has("storage:own")) {
    const ns = `noter:plugin:${manifest.id}:`;
    ctx.storage = {
      async get(key)         { try { const r = localStorage.getItem(ns + key); return r ? JSON.parse(r) : null; } catch { return null; } },
      async set(key, value)  { localStorage.setItem(ns + key, JSON.stringify(value)); },
      async delete(key)      { localStorage.removeItem(ns + key); },
      async list()           { return Object.keys(localStorage).filter((k) => k.startsWith(ns)).map((k) => k.slice(ns.length)); },
    };
  }

  const needsUI = ["ui:sidebar","ui:tab","ui:toolbar","ui:overlay"].some((p) => perms.has(p as never));
  if (needsUI) {
    ctx.ui = {
      registerPage(componentKey, component) {
        kernel.slots.register(`page:${componentKey}`, component as ComponentType<unknown>);
      },
      registerSidebarItem(item) {
        if (!perms.has("ui:sidebar")) return;
        import("@/features/sidebar").then(({ SIDEBAR_EVENTS }) => {
          eventBus.emit(SIDEBAR_EVENTS.REGISTER_ITEM, { ...item, isPanelItem: item.isPanelItem ?? false });
        });
      },
      registerToolbarItem(component) {
        if (!perms.has("ui:toolbar")) return;
        kernel.slots.register(`editor.toolbar.${manifest.id}`, component as ComponentType<unknown>);
      },
      showToast(message, type = "info") {
        eventBus.emit("ui:toast", { message, type });
      },
      openTab(opts) {
        if (!perms.has("ui:tab")) return;
        eventBus.emit("tabs:open", { ...opts, component: () => null, props: { _componentKey: opts.componentKey }, closeable: true, pinned: false });
      },
    };
  }

  if (perms.has("keyboard:global")) {
    ctx.keyboard = {
      register(shortcut, handler) {
        eventBus.emit("keyboard:register", { shortcut, handler });
        return () => eventBus.emit("keyboard:unregister", { shortcut });
      },
    };
  }

  if (perms.has("events:emit") || perms.has("events:listen")) {
    ctx.events = {
      emit(event, payload) {
        if (!perms.has("events:emit")) return;
        eventBus.emit(`plugin:${manifest.id}:${event}`, payload);
      },
      on(event, handler) {
        if (!perms.has("events:listen")) return () => {};
        return eventBus.on(`plugin:${manifest.id}:${event}`, handler);
      },
    };
  }

  return ctx;
}