// ─────────────────────────────────────────────────────────────────────────────
// Plugin Permission Types
// ─────────────────────────────────────────────────────────────────────────────

export type PluginPermission =
  | "notes:read"
  | "notes:write"
  | "canvas:read"
  | "canvas:write"
  | "storage:own"
  | "ui:sidebar"
  | "ui:tab"
  | "ui:overlay"
  | "ui:toolbar"
  | "keyboard:global"
  | "events:emit"
  | "events:listen";

export const PERMISSION_LABELS: Record<PluginPermission, string> = {
  "notes:read":      "Read your notes",
  "notes:write":     "Create and modify notes",
  "canvas:read":     "Read your drawings",
  "canvas:write":    "Create and modify drawings",
  "storage:own":     "Store plugin data locally",
  "ui:sidebar":      "Add an item to the sidebar",
  "ui:tab":          "Open tabs in the app",
  "ui:overlay":      "Show floating UI overlays",
  "ui:toolbar":      "Add buttons to the editor toolbar",
  "keyboard:global": "Register global keyboard shortcuts",
  "events:emit":     "Emit events to the app",
  "events:listen":   "Listen to app events",
};

/** Permissions that show a warning in the install UI. */
export const SENSITIVE_PERMISSIONS = new Set<PluginPermission>([
  "notes:write",
  "canvas:write",
  "keyboard:global",
  "ui:overlay",
]);