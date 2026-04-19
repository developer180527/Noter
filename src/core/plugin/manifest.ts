// ─────────────────────────────────────────────────────────────────────────────
// Plugin Manifest
// The manifest.json every plugin must ship alongside plugin.js.
// ─────────────────────────────────────────────────────────────────────────────

import type { PluginPermission } from "./permissions";

export interface PluginManifest {
  /** Reverse-domain unique ID, e.g. "com.yourname.myplugin" */
  id:           string;
  /** Human-readable name shown in the Plugins settings section. */
  name:         string;
  /** Semver string. */
  version:      string;
  /** One-line description shown in the Plugins list. */
  description?: string;
  /** Plugin author name or handle. */
  author?:      string;
  /** Homepage / repo URL. */
  homepage?:    string;
  /** Permissions this plugin needs. Only granted keys appear in PluginContext. */
  permissions:  PluginPermission[];
  /** Filename of the compiled plugin entry. Defaults to "plugin.js". */
  entryPoint?:  string;
}

/** Validates a raw JSON object as a PluginManifest. Returns errors or null. */
export function validateManifest(raw: unknown): string[] {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null) {
    return ["Manifest must be a JSON object"];
  }
  const m = raw as Record<string, unknown>;

  if (!m.id || typeof m.id !== "string")
    errors.push("Missing or invalid 'id' (string required)");
  else if (!/^[a-zA-Z0-9._-]+$/.test(m.id))
    errors.push("'id' must only contain letters, numbers, dots, hyphens, underscores");

  if (!m.name || typeof m.name !== "string")
    errors.push("Missing or invalid 'name' (string required)");

  if (!m.version || typeof m.version !== "string")
    errors.push("Missing or invalid 'version' (semver string required)");

  if (!Array.isArray(m.permissions))
    errors.push("Missing or invalid 'permissions' (array required)");

  return errors;
}