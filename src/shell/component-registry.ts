// ─────────────────────────────────────────────────────────────────────────────
// component-registry.ts — INTENTIONALLY EMPTY
//
// Pages are no longer registered here. Each feature registers its own page
// component into the kernel slot registry during onStart:
//
//   slots.register("page:notes-page", NotesPage)
//
// TabContent resolves components via kernel.slots.get(`page:${componentKey}`)
// This allows plugins to register pages without touching any shell file.
// ─────────────────────────────────────────────────────────────────────────────

export type ComponentRegistry = Record<string, never>;
export const COMPONENT_REGISTRY: ComponentRegistry = {};
