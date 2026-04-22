// ─────────────────────────────────────────────────────────────────────────────
// bridge-host.ts — v2
//  1. Origin: IFRAME_ORIGIN = "null" used; source + origin both validated
//  2. Runtime payload validation via guard helpers before any cast
//  3. Normalized canonical outputs; storage.get JSON.parse wrapped in try/catch
//  4. In-flight throttle — max MAX_INFLIGHT concurrent requests
//  5. events.subscribe cleans up existing sub before overwriting
//  6. Event forwarding sanitizes payload before sending to iframe
//  7. Single-iframe page component documented clearly
//  8. Structured error responses { message, code } instead of bare strings
//  9. _validate() layer separates transport from dispatch logic
// ─────────────────────────────────────────────────────────────────────────────

import type { PluginManifest }   from "./manifest";
import type { PluginPermission } from "./permissions";
import type { KernelInterface, EventBusInterface } from "../types";
import { BRIDGE_CLIENT_CODE }    from "./bridge-client";

// ── Constants ─────────────────────────────────────────────────────────────────

// Fix 1: sandboxed srcdoc iframes always report origin "null" (string literal).
// We cannot use window.location.origin as targetOrigin when posting TO the iframe
// because the iframe's own origin is "null", not the parent origin.
// We DO validate event.origin === IFRAME_ORIGIN on messages FROM the iframe.
const IFRAME_ORIGIN = "null";

// Fix 4
const MAX_INFLIGHT = 20;

// ── Action → permission map ───────────────────────────────────────────────────

const ACTION_PERMISSIONS: Record<string, PluginPermission> = {
  "notes.list":             "notes:read",
  "notes.read":             "notes:read",
  "notes.create":           "notes:write",
  "notes.update":           "notes:write",
  "notes.delete":           "notes:write",
  "canvas.list":            "canvas:read",
  "canvas.create":          "canvas:write",
  "canvas.rename":          "canvas:write",
  "canvas.delete":          "canvas:write",
  "storage.get":            "storage:own",
  "storage.set":            "storage:own",
  "storage.delete":         "storage:own",
  "storage.list":           "storage:own",
  "ui.registerSidebarItem": "ui:sidebar",
  "ui.registerPage":        "ui:tab",
  "ui.openTab":             "ui:tab",
  "ui.showToast":           "ui:sidebar",
  "events.emit":            "events:emit",
  "events.subscribe":       "events:listen",
  "events.unsubscribe":     "events:listen",
};

// ── Fix 8: Structured error ───────────────────────────────────────────────────

type ErrorCode =
  | "PERMISSION_DENIED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "THROTTLED"
  | "INTERNAL_ERROR"
  | "UNKNOWN_ACTION";

interface BridgeError { message: string; code: ErrorCode; }

const err = (message: string, code: ErrorCode): BridgeError => ({ message, code });

// ── Fix 2: Runtime validation guards ─────────────────────────────────────────

class ValidationError   extends Error { constructor(m: string) { super(m); this.name = "ValidationError";   } }
class PermissionError   extends Error { constructor(m: string) { super(m); this.name = "PermissionError";   } }
class NotFoundError     extends Error { constructor(m: string) { super(m); this.name = "NotFoundError";     } }
class UnknownActionError extends Error { constructor(m: string) { super(m); this.name = "UnknownActionError"; } }

function assertString(v: unknown, f: string): string {
  if (typeof v !== "string" || !v.trim()) throw new ValidationError(`'${f}' must be a non-empty string`);
  return v;
}
function assertOptionalString(v: unknown, f: string): string | undefined {
  return v == null ? undefined : assertString(v, f);
}
function assertStringArray(v: unknown, f: string): string[] {
  if (!Array.isArray(v)) throw new ValidationError(`'${f}' must be an array`);
  return v.map((x, i) => assertString(x, `${f}[${i}]`));
}
function assertObject(v: unknown, f: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v))
    throw new ValidationError(`'${f}' must be an object`);
  return v as Record<string, unknown>;
}
function assertSerializable(v: unknown, f: string): unknown {
  try { JSON.stringify(v); return v; }
  catch { throw new ValidationError(`'${f}' must be JSON-serializable`); }
}

// Fix 6: sanitize event payloads before forwarding
function sanitize(data: unknown): unknown {
  try { return JSON.parse(JSON.stringify(data ?? null)); }
  catch { return null; }
}

// ── Message types ─────────────────────────────────────────────────────────────

interface PluginRequest { id: string; action: string; payload?: unknown; }
interface HostResponse  { id: string; result?: unknown; error?: BridgeError; }

// ── PluginBridgeHost ──────────────────────────────────────────────────────────

export class PluginBridgeHost {
  private manifest:  PluginManifest;
  private perms:     Set<PluginPermission>;
  private kernel:    KernelInterface;
  private eventBus:  EventBusInterface;
  private iframe:    HTMLIFrameElement | null = null;
  private ready:     Promise<void>;
  private resolveReady!: () => void;
  private rejectReady!:  (e: Error) => void;
  private inFlight   = 0;                          // Fix 4
  private eventUnsubs = new Map<string, () => void>(); // Fix 5

  constructor(manifest: PluginManifest, kernel: KernelInterface, eventBus: EventBusInterface) {
    this.manifest = manifest;
    this.perms    = new Set(manifest.permissions);
    this.kernel   = kernel;
    this.eventBus = eventBus;
    this.ready    = new Promise<void>((res, rej) => {
      this.resolveReady = res;
      this.rejectReady  = rej;
    });
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  async mount(pluginCode: string): Promise<void> {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.style.cssText = "display:none;width:0;height:0;border:0;position:absolute;";
    iframe.srcdoc = this._buildDocument(pluginCode);
    this.iframe   = iframe;
    document.body.appendChild(iframe);
    window.addEventListener("message", this._onMessage);
    const t = setTimeout(() =>
      this.rejectReady(new Error(`Plugin '${this.manifest.id}' boot timeout`)), 15_000);
    try { await this.ready; } finally { clearTimeout(t); }
  }

  // ── Document builder ──────────────────────────────────────────────────────

  private _buildDocument(pluginCode: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>
${BRIDGE_CLIENT_CODE}
try {
  ${pluginCode}
  if (typeof activate === "function") {
    Promise.resolve(activate(ctx)).then(function() {
      window.parent.postMessage({ __type: "plugin:ready" }, "*");
    }).catch(function(e) {
      window.parent.postMessage({ __type: "plugin:error", message: e && e.message ? e.message : String(e) }, "*");
    });
  } else {
    window.parent.postMessage({ __type: "plugin:error", message: "activate() not found" }, "*");
  }
} catch(e) {
  window.parent.postMessage({ __type: "plugin:error", message: e && e.message ? e.message : String(e) }, "*");
}
<\/script></body></html>`;
  }

  // ── Message handler ───────────────────────────────────────────────────────

  private _onMessage = async (event: MessageEvent) => {
    if (!this.iframe || event.source !== this.iframe.contentWindow) return;

    // Fix 1: validate origin — sandboxed srcdoc iframes report "null"
    if (event.origin !== IFRAME_ORIGIN) {
      console.warn(`[BridgeHost:${this.manifest.id}] Rejected message from origin:`, event.origin);
      return;
    }

    const data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.__type === "plugin:ready") { this.resolveReady(); return; }
    if (data.__type === "plugin:error") { this.rejectReady(new Error(data.message ?? "Plugin boot error")); return; }

    const { id, action, payload } = data as PluginRequest;
    if (typeof id !== "string" || typeof action !== "string") return;

    // Fix 4: throttle concurrent requests
    if (this.inFlight >= MAX_INFLIGHT) {
      this._reply({ id, error: err(`Max ${MAX_INFLIGHT} concurrent requests exceeded`, "THROTTLED") });
      return;
    }

    this.inFlight++;
    try {
      // Fix 9: validate before dispatch
      const safe   = this._validate(action, payload);
      const result = await this._dispatch(action, safe);
      this._reply({ id, result });
    } catch (e) {
      // Fix 8: structured error response
      if (e instanceof ValidationError)    this._reply({ id, error: err(e.message, "VALIDATION_ERROR") });
      else if (e instanceof PermissionError)   this._reply({ id, error: err(e.message, "PERMISSION_DENIED") });
      else if (e instanceof NotFoundError)     this._reply({ id, error: err(e.message, "NOT_FOUND") });
      else if (e instanceof UnknownActionError) this._reply({ id, error: err(e.message, "UNKNOWN_ACTION") });
      else this._reply({ id, error: err(e instanceof Error ? e.message : String(e), "INTERNAL_ERROR") });
    } finally {
      this.inFlight--;
    }
  };

  // ── Fix 9: Validation layer ───────────────────────────────────────────────

  private _validate(action: string, payload: unknown): unknown {
    switch (action) {
      case "notes.list": case "canvas.list": case "storage.list": return undefined;

      case "notes.read": case "notes.delete": case "canvas.delete": {
        const p = assertObject(payload, "payload");
        assertString(p.id, "id"); return p;
      }
      case "notes.create": {
        const p = assertObject(payload ?? {}, "payload");
        if (p.title !== undefined) assertString(p.title, "title");
        if (p.body  !== undefined) assertString(p.body,  "body");
        if (p.tags  !== undefined) assertStringArray(p.tags, "tags");
        return p;
      }
      case "notes.update": {
        const p = assertObject(payload, "payload");
        assertString(p.id, "id");
        const patch = assertObject(p.patch, "patch");
        if (patch.title !== undefined) assertString(patch.title, "title");
        if (patch.body  !== undefined) assertString(patch.body,  "body");
        if (patch.tags  !== undefined) assertStringArray(patch.tags as unknown, "tags");
        return p;
      }
      case "canvas.create": {
        const p = assertObject(payload ?? {}, "payload");
        if (p.title !== undefined) assertString(p.title, "title");
        return p;
      }
      case "canvas.rename": {
        const p = assertObject(payload, "payload");
        assertString(p.id, "id"); assertString(p.title, "title"); return p;
      }
      case "storage.get": case "storage.delete": {
        const p = assertObject(payload, "payload");
        assertString(p.key, "key"); return p;
      }
      case "storage.set": {
        const p = assertObject(payload, "payload");
        assertString(p.key, "key"); assertSerializable(p.value, "value"); return p;
      }
      case "ui.registerSidebarItem": {
        const p = assertObject(payload, "payload");
        assertString(p.id, "id"); assertString(p.label, "label");
        assertString(p.icon, "icon"); assertString(p.componentKey, "componentKey");
        return p;
      }
      case "ui.registerPage": {
        const p = assertObject(payload, "payload");
        assertString(p.componentKey, "componentKey"); return p;
      }
      case "ui.openTab": {
        const p = assertObject(payload, "payload");
        assertString(p.id, "id"); assertString(p.title, "title");
        assertString(p.componentKey, "componentKey"); return p;
      }
      case "ui.showToast": {
        const p = assertObject(payload, "payload");
        assertString(p.message, "message");
        if (p.type !== undefined) assertString(p.type, "type");
        return p;
      }
      case "events.emit": {
        const p = assertObject(payload, "payload");
        assertString(p.event, "event"); return p;
      }
      case "events.subscribe": {
        const p = assertObject(payload, "payload");
        assertString(p.event, "event"); assertString(p.subId, "subId"); return p;
      }
      case "events.unsubscribe": {
        const p = assertObject(payload, "payload");
        assertString(p.subId, "subId"); return p;
      }
      default: throw new UnknownActionError(`Unknown action: '${action}'`);
    }
  }

  // ── Dispatcher ────────────────────────────────────────────────────────────

  private async _dispatch(action: string, payload: unknown): Promise<unknown> {
    const required = ACTION_PERMISSIONS[action];
    if (required && !this.perms.has(required))
      throw new PermissionError(`'${action}' requires '${required}'`);

    switch (action) {
      case "notes.list": {
        const { useNoteStore } = await import("@/features/notes/note.store");
        // Fix 3: canonical normalized output
        return useNoteStore.getState().notes
          .filter(n => !n.archived)
          .map(n => ({ id: String(n.id), title: String(n.title ?? ""), tags: Array.isArray(n.tags) ? n.tags.map(String) : [], updatedAt: Number(n.updatedAt) }));
      }
      case "notes.read": {
        const { id } = payload as { id: string };
        const { useNoteStore } = await import("@/features/notes/note.store");
        const note = useNoteStore.getState().notes.find(n => n.id === id);
        if (!note) throw new NotFoundError(`Note '${id}' not found`);
        return { id: String(note.id), title: String(note.title ?? ""), body: String(note.body ?? ""), tags: Array.isArray(note.tags) ? note.tags.map(String) : [] };
      }
      case "notes.create": {
        const { useNoteStore } = await import("@/features/notes/note.store");
        return String(await useNoteStore.getState().createNote(payload as any));
      }
      case "notes.update": {
        const { id, patch } = payload as { id: string; patch: any };
        const { useNoteStore } = await import("@/features/notes/note.store");
        if (!useNoteStore.getState().notes.some(n => n.id === id)) throw new NotFoundError(`Note '${id}' not found`);
        useNoteStore.getState().updateNote(id, patch);
        return null;
      }
      case "notes.delete": {
        const { id } = payload as { id: string };
        const { useNoteStore } = await import("@/features/notes/note.store");
        useNoteStore.getState().deleteNote(id); return null;
      }
      case "canvas.list": {
        const { useCanvasStore } = await import("@/features/canvas/canvas.store");
        return useCanvasStore.getState().drawings.map(d => ({ id: String(d.id), title: String(d.title ?? ""), updatedAt: Number(d.updatedAt) }));
      }
      case "canvas.create": {
        const { title } = payload as { title?: string };
        const { useCanvasStore } = await import("@/features/canvas/canvas.store");
        return String(useCanvasStore.getState().createDrawing(title));
      }
      case "canvas.rename": {
        const { id, title } = payload as { id: string; title: string };
        const { useCanvasStore } = await import("@/features/canvas/canvas.store");
        if (!useCanvasStore.getState().drawings.some(d => d.id === id)) throw new NotFoundError(`Drawing '${id}' not found`);
        useCanvasStore.getState().renameDrawing(id, title); return null;
      }
      case "canvas.delete": {
        const { id } = payload as { id: string };
        const { useCanvasStore } = await import("@/features/canvas/canvas.store");
        useCanvasStore.getState().deleteDrawing(id); return null;
      }
      case "storage.get": {
        const { key } = payload as { key: string };
        const raw = localStorage.getItem(`noter:plugin:${this.manifest.id}:${key}`);
        if (raw === null) return null;
        // Fix 3: corrupted data returns null instead of throwing
        try { return JSON.parse(raw); }
        catch { console.warn(`[BridgeHost:${this.manifest.id}] Corrupted key '${key}'`); return null; }
      }
      case "storage.set": {
        const { key, value } = payload as { key: string; value: unknown };
        localStorage.setItem(`noter:plugin:${this.manifest.id}:${key}`, JSON.stringify(value));
        return null;
      }
      case "storage.delete": {
        const { key } = payload as { key: string };
        localStorage.removeItem(`noter:plugin:${this.manifest.id}:${key}`); return null;
      }
      case "storage.list": {
        const ns = `noter:plugin:${this.manifest.id}:`;
        return Object.keys(localStorage).filter(k => k.startsWith(ns)).map(k => k.slice(ns.length));
      }
      case "ui.registerSidebarItem": {
        const { SIDEBAR_EVENTS } = await import("@/features/sidebar");
        this.eventBus.emit(SIDEBAR_EVENTS.REGISTER_ITEM, { ...(payload as object), isPanelItem: false });
        return null;
      }
      case "ui.registerPage": {
        const { componentKey } = payload as { componentKey: string };
        this.kernel.slots.register(`page:${componentKey}`, this._makeIframePageComponent());
        return null;
      }
      case "ui.openTab": {
        const { id, title, componentKey } = payload as { id: string; title: string; componentKey: string };
        this.eventBus.emit("tabs:open", { id, title, component: () => null, props: { _componentKey: componentKey }, closeable: true, pinned: false });
        return null;
      }
      case "ui.showToast":
        this.eventBus.emit("ui:toast", payload); return null;

      case "events.emit": {
        const { event, data } = payload as { event: string; data?: unknown };
        this.eventBus.emit(`plugin:${this.manifest.id}:${event}`, sanitize(data)); // Fix 6
        return null;
      }
      case "events.subscribe": {
        const { event, subId } = payload as { event: string; subId: string };
        // Fix 5: clean up before overwriting
        if (this.eventUnsubs.has(subId)) {
          this.eventUnsubs.get(subId)!();
          this.eventUnsubs.delete(subId);
        }
        const unsub = this.eventBus.on(`plugin:${this.manifest.id}:${event}`, (data) => {
          if (!this.iframe?.contentWindow) return;
          // Fix 6: sanitize before forwarding; Fix 1: "*" required for null-origin iframes
          this.iframe.contentWindow.postMessage(
            { __type: "plugin:event", event, subId, data: sanitize(data) }, "*"
          );
        });
        this.eventUnsubs.set(subId, unsub);
        return null;
      }
      case "events.unsubscribe": {
        const { subId } = payload as { subId: string };
        this.eventUnsubs.get(subId)?.();
        this.eventUnsubs.delete(subId);
        return null;
      }
      default: throw new UnknownActionError(`Unknown action: '${action}'`);
    }
  }

  // ── Reply ─────────────────────────────────────────────────────────────────

  private _reply(r: HostResponse) {
    if (!this.iframe?.contentWindow) return;
    // Fix 1: use "*" when posting TO the iframe (its origin is "null")
    this.iframe.contentWindow.postMessage(r, "*");
  }

  // ── Iframe page component ─────────────────────────────────────────────────
  // Fix 7: documented single-instance constraint.
  // This moves the hidden iframe into the visible tab container.
  // Only ONE tab can display this plugin at a time — the iframe physically
  // moves to whichever tab rendered last. A multi-instance model (one iframe
  // per tab) would require spawning a separate BridgeHost per tab and is
  // deferred to a future version of the plugin system.

  private _makeIframePageComponent() {
    const iframe = this.iframe;
    return function PluginIframePage() {
      const React = (window as any).__noterReact;
      if (!React || !iframe) return null;
      return React.createElement("div", {
        style: { width: "100%", height: "100%", position: "relative" },
        ref: (el: HTMLElement | null) => {
          if (!el || iframe.parentElement === el) return;
          iframe.style.cssText = "width:100%;height:100%;border:0;display:block;";
          el.appendChild(iframe);
        },
      });
    };
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  destroy(): void {
    this.eventUnsubs.forEach(u => u());
    this.eventUnsubs.clear();
    window.removeEventListener("message", this._onMessage);
    if (this.iframe) {
      this.iframe.srcdoc = "";
      this.iframe.remove();
      this.iframe = null;
    }
  }

  waitForReady(): Promise<void> { return this.ready; }
}