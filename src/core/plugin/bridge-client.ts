// ─────────────────────────────────────────────────────────────────────────────
// bridge-client.ts
//
// This file has TWO purposes:
//
// 1. At runtime it is exported as a plain JS STRING (BRIDGE_CLIENT_CODE)
//    that bridge-host.ts inlines into every plugin iframe's srcdoc.
//    It runs inside the sandboxed iframe — no bundler, no imports.
//
// 2. The same code is also exported as typed TypeScript interfaces so the
//    noter-plugin-sdk package can re-export them for plugin developers.
//
// ── Important constraints for the inlined string ──────────────────────────────
//   • No import/export statements inside BRIDGE_CLIENT_CODE
//   • No TypeScript syntax — it runs as plain JS in the iframe
//   • Must be fully self-contained
//   • Uses only web-standard APIs (postMessage, Promise, Map, crypto)
// ─────────────────────────────────────────────────────────────────────────────

// ── TypeScript interface (for SDK consumers) ──────────────────────────────────

export interface BridgeNotesReadAPI {
  list():             Promise<Array<{ id: string; title: string; tags: string[]; updatedAt: number }>>;
  read(id: string):   Promise<{ id: string; title: string; body: string; tags: string[] } | null>;
}

export interface BridgeNotesWriteAPI {
  create(data: { title?: string; body?: string; tags?: string[] }): Promise<string>;
  update(id: string, patch: { title?: string; body?: string; tags?: string[] }): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface BridgeCanvasReadAPI {
  list(): Promise<Array<{ id: string; title: string; updatedAt: number }>>;
}

export interface BridgeCanvasWriteAPI {
  create(title?: string):             Promise<string>;
  rename(id: string, title: string):  Promise<void>;
  delete(id: string):                 Promise<void>;
}

export interface BridgeStorageAPI {
  get(key: string):                   Promise<unknown>;
  set(key: string, value: unknown):   Promise<void>;
  delete(key: string):                Promise<void>;
  list():                             Promise<string[]>;
}

export interface BridgeUIAPI {
  registerSidebarItem(item: {
    id: string; label: string; icon: string; componentKey: string; isPanelItem?: boolean;
  }): Promise<void>;
  registerPage(componentKey: string): Promise<void>;
  openTab(opts: { id: string; title: string; componentKey: string }): Promise<void>;
  showToast(message: string, type?: "info" | "success" | "error" | "warning"): Promise<void>;
}

export interface BridgeEventsAPI {
  emit(event: string, data?: unknown): Promise<void>;
  on(event: string, handler: (data: unknown) => void): Promise<() => void>;
}

export interface PluginCtx {
  notes?:       BridgeNotesReadAPI;
  notesWrite?:  BridgeNotesWriteAPI;
  canvas?:      BridgeCanvasReadAPI;
  canvasWrite?: BridgeCanvasWriteAPI;
  storage?:     BridgeStorageAPI;
  ui?:          BridgeUIAPI;
  events?:      BridgeEventsAPI;
}

// ── The inlined string ────────────────────────────────────────────────────────
// This is the actual code that executes inside the plugin iframe.
// It MUST be plain JS — no TypeScript, no ESM imports.

export const BRIDGE_CLIENT_CODE = /* js */`
(function () {
  'use strict';

  // ── Pending request registry ────────────────────────────────────────────
  var _pending = new Map();

  // ── Event subscription registry ────────────────────────────────────────
  var _eventHandlers = new Map(); // subId → handler function

  // ── Core call function ──────────────────────────────────────────────────
  function _call(action, payload) {
    return new Promise(function (resolve, reject) {
      var id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);

      _pending.set(id, { resolve: resolve, reject: reject });

      window.parent.postMessage({ id: id, action: action, payload: payload }, '*');

      // 10 second timeout per call
      setTimeout(function () {
        if (_pending.has(id)) {
          _pending.delete(id);
          reject(new Error('Call timed out: ' + action));
        }
      }, 10000);
    });
  }

  // ── Response listener ───────────────────────────────────────────────────
  window.addEventListener('message', function (event) {
    if (event.source !== window.parent) return;
    var data = event.data;
    if (!data || typeof data !== 'object') return;

    // Incoming event from noter (subscriptions)
    if (data.__type === 'plugin:event') {
      var handlers = _eventHandlers.get(data.subId);
      if (handlers) handlers(data.data);
      return;
    }

    // Response to a pending request
    var p = _pending.get(data.id);
    if (!p) return;
    _pending.delete(data.id);
    if (data.error) {
      p.reject(new Error(data.error));
    } else {
      p.resolve(data.result !== undefined ? data.result : null);
    }
  });

  // ── ctx object ──────────────────────────────────────────────────────────
  // All properties exist — the host ignores calls for unpermitted actions
  // and returns a permission error instead of crashing.

  window.ctx = {

    notes: {
      list:   function ()   { return _call('notes.list'); },
      read:   function (id) { return _call('notes.read', { id: id }); },
    },

    notesWrite: {
      create: function (data)         { return _call('notes.create', data); },
      update: function (id, patch)    { return _call('notes.update', { id: id, patch: patch }); },
      delete: function (id)           { return _call('notes.delete', { id: id }); },
    },

    canvas: {
      list:   function ()                   { return _call('canvas.list'); },
    },

    canvasWrite: {
      create: function (title)              { return _call('canvas.create', { title: title }); },
      rename: function (id, title)          { return _call('canvas.rename', { id: id, title: title }); },
      delete: function (id)                 { return _call('canvas.delete', { id: id }); },
    },

    storage: {
      get:    function (key)                { return _call('storage.get',    { key: key }); },
      set:    function (key, value)         { return _call('storage.set',    { key: key, value: value }); },
      delete: function (key)                { return _call('storage.delete', { key: key }); },
      list:   function ()                   { return _call('storage.list'); },
    },

    ui: {
      registerSidebarItem: function (item)  { return _call('ui.registerSidebarItem', item); },
      registerPage:        function (key)   { return _call('ui.registerPage', { componentKey: key }); },
      openTab:             function (opts)  { return _call('ui.openTab', opts); },
      showToast:           function (msg, type) {
        return _call('ui.showToast', { message: msg, type: type || 'info' });
      },
    },

    events: {
      emit: function (event, data) {
        return _call('events.emit', { event: event, data: data });
      },
      on: function (event, handler) {
        var subId = (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2));

        _eventHandlers.set(subId, handler);

        return _call('events.subscribe', { event: event, subId: subId }).then(function () {
          // Return an unsubscribe function
          return function () {
            _eventHandlers.delete(subId);
            _call('events.unsubscribe', { subId: subId }).catch(function () {});
          };
        });
      },
    },

  };

  // Make ctx available as a named parameter too
  window.__noterCtx = window.ctx;

})();
`;